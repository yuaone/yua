# YUA Document AI — 설계 문서 (SSOT)

> 최종 수정: 2026-03-06
> 역할 분배: 백엔드A (API + DB), 백엔드B (AI Pipeline + Embedding), 프론트 (UI + 에디터 통합), QA (검증)

---

## 1. 개요

문서 에디터 내 두 가지 AI 기능:
1. **AI 블록** — 슬래시 커맨드로 인라인 AI 텍스트 생성
2. **DocChat** — 문서 하단 RAG 채팅 (문서 내용 기반 Q&A)

---

## 2. 아키텍처 결정

### 2.1 채팅 vs 문서 모드 분리

| | Chat (기존) | Document AI |
|---|---|---|
| **트랜스포트** | SSE 스트리밍 (`/api/stream`) | **REST JSON** (1차) → SSE (2차 선택) |
| **컨텍스트** | thread history + memory | **문서 블록만** (RAG) |
| **프롬프트** | prompt-builder.ts (50KB) | **doc-prompt-builder.ts** (신규, 경량) |
| **Provider** | provider-selector.ts (다중 엔진) | **GPT-4.1-mini 고정** (빠름+저렴) |
| **응답 형태** | 마크다운 스트림 | 마크다운 + **citations** (block 참조) |
| **상태 관리** | StreamEngine FSM | **단순 request/response** (AI 블록) or **DocChat session** |

**결정: 1차는 REST, 2차에 SSE 옵션 추가**

이유:
- AI 블록은 짧은 생성 (200~500 토큰) → 스트리밍 불필요
- DocChat은 긴 답변 가능하지만 1차에서는 REST로 충분
- 기존 StreamEngine/StreamClient 복잡도를 문서에 끌고 오면 유지보수 폭발
- 2차에 `/api/doc/stream` SSE 엔드포인트 추가하면 됨 (StreamEngine 재사용 가능)

### 2.2 프롬프트 빌더 분리

기존 `prompt-builder.ts` (50KB)는 **채팅 전용** — memory, persona, continuation rule 등 문서에 불필요한 로직이 가득.

**새로 `doc-prompt-builder.ts` 생성:**

```typescript
// src/ai/utils/doc-prompt-builder.ts
export function buildDocAiPrompt(opts: {
  mode: "generate" | "chat";
  prompt: string;
  context: DocContext[];  // RAG 검색 결과
  docTitle: string;
  selectionText?: string;  // 현재 선택 영역
}): ChatMessage[] {
  const systemMsg = mode === "generate"
    ? DOC_GENERATE_SYSTEM  // "문서 작성 도우미. 요청에 따라 텍스트 생성."
    : DOC_CHAT_SYSTEM;     // "문서 Q&A 전문가. 근거는 반드시 citations."
  // ...
}
```

### 2.3 Provider 고정

```
Document AI → gpt-4.1-mini (고정)
이유: 빠른 응답 (TTFT ~200ms), 저렴, 문서 생성에 충분한 품질
```

기존 `provider-selector.ts`의 키워드 라우팅은 사용하지 않음.
직접 `gpt-provider.ts`의 `callGPT()` 호출.

---

## 3. DB 스키마

### 3.1 document_blocks (임베딩 + 블록 저장)

```sql
-- 백엔드A 담당
CREATE TABLE IF NOT EXISTS document_blocks (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  doc_id        TEXT NOT NULL REFERENCES workspace_docs(id) ON DELETE CASCADE,
  block_type    TEXT NOT NULL DEFAULT 'paragraph',  -- heading, paragraph, codeBlock, etc.
  block_order   INT NOT NULL DEFAULT 0,
  content       TEXT NOT NULL DEFAULT '',
  content_hash  TEXT,  -- SHA-256 of content (stale 방지)
  embedding     vector(1536),  -- pgvector (text-embedding-3-small)
  block_part    INT DEFAULT 0,  -- 0 = 전체, 1+ = split 파트
  parent_id     TEXT,  -- subtree 검색용
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- HNSW 인덱스 (ivfflat보다 리콜 우수, 빌드 느리지만 문서 규모에선 OK)
CREATE INDEX IF NOT EXISTS idx_doc_blocks_embedding
  ON document_blocks USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS idx_doc_blocks_doc_id
  ON document_blocks (doc_id);
```

### 3.2 DocChat 테이블

```sql
-- 기존 thread 시스템 재활용
-- workspace_docs 기반 thread: content_type = 'doc_chat'
-- thread_id는 doc_id별로 1개 auto-create

CREATE TABLE IF NOT EXISTS doc_chat_messages (
  id          SERIAL PRIMARY KEY,
  doc_id      TEXT NOT NULL REFERENCES workspace_docs(id) ON DELETE CASCADE,
  session_id  TEXT NOT NULL,  -- 세션 (같은 문서에서 여러 대화 가능)
  role        TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content     TEXT NOT NULL,
  citations   JSONB DEFAULT '[]',
  -- citations: [{ block_id, content_preview, score, anchor }]
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doc_chat_doc_session
  ON doc_chat_messages (doc_id, session_id, created_at);
```

---

## 4. API 엔드포인트

### 4.1 AI 블록 생성 (백엔드A)

```
POST /api/workspace/docs/:docId/ai/generate
Auth: Firebase + Workspace
Body: {
  prompt: string,
  mode: "generate" | "rewrite" | "summarize" | "translate",
  selectionText?: string,   // Replace selection 모드용
  blockContext?: string[]    // 주변 블록 ID (컨텍스트)
}
Response: {
  ok: true,
  result: string,           // 마크다운 텍스트
  model: "gpt-4.1-mini",
  usage: { promptTokens, completionTokens }
}
```

### 4.2 DocChat (백엔드A + 백엔드B)

```
POST /api/workspace/docs/:docId/chat
Auth: Firebase + Workspace
Body: {
  sessionId: string,      // 클라이언트 생성 UUID
  message: string,
  topK?: number           // default 8
}
Response: {
  ok: true,
  reply: string,          // 마크다운
  citations: [{
    block_id: string,
    block_type: string,
    content_preview: string,  // 첫 200자
    score: number,
    anchor: { from: number, to: number }  // ProseMirror 위치
  }],
  model: "gpt-4.1-mini",
  sessionId: string
}
```

### 4.3 임베딩 동기화 (백엔드B)

```
POST /api/workspace/docs/:docId/sync-blocks
Auth: internal (auto-save 트리거)
Body: {
  blocks: [{
    id?: string,
    type: string,
    content: string,
    order: number
  }]
}
Response: { ok: true, synced: number, queued: number }
```

---

## 5. 임베딩 파이프라인 (백엔드B 담당)

### 5.1 흐름

```
에디터 auto-save (1.5초 debounce)
  → PUT /api/workspace/docs/:docId/content  (기존)
  → 내부: syncDocBlocks(docId, contentJson)
      → JSON → block 배열 파싱
      → 각 block: content_hash = SHA-256(content)
      → DB upsert (document_blocks)
      → hash 변경된 블록만 → embedding job enqueue
  → Worker: processEmbeddingJob(blockId)
      → content 로드
      → OpenAI text-embedding-3-small (1536 dim)
      → content_hash 재확인 (stale 방지)
      → UPDATE document_blocks SET embedding = $1 WHERE id = $2 AND content_hash = $3
```

### 5.2 Chunk 전략

```
1 block = 1 chunk (기본)

긴 블록 (>1,500 chars):
  → split by sentence boundary (마침표/줄바꿈)
  → 각 파트 block_part = 0, 1, 2, ...
  → 원본 block_id 유지, block_part로 구분

codeBlock:
  → 임베딩 생성 안 함 (코드 블록은 검색 품질 저하)
  → DB에는 저장하되 embedding = NULL 유지

Heading 블록:
  → heading + 바로 아래 첫 paragraph 병합 임베딩 (컨텍스트 보강)
```

### 5.3 검색 (RAG Retrieval)

```sql
-- 기본: 단일 문서 스코프
SELECT id, block_type, content, block_order,
       1 - (embedding <=> $1::vector) AS score
FROM document_blocks
WHERE doc_id = $2
  AND embedding IS NOT NULL
  AND block_type != 'codeBlock'   -- 코드 블록 제외 (embedding 검색 품질 저하)
ORDER BY score DESC
LIMIT $3;  -- topK (default 8)
```

### 5.4 랭킹 보정

```typescript
function adjustScores(results: BlockResult[]): BlockResult[] {
  return results.map(r => {
    let boost = 0;
    // heading soft boost
    if (r.block_type.startsWith("heading")) boost += 0.02;
    // 최근 편집 가중치 (24시간 이내)
    const hoursSinceUpdate = (Date.now() - r.updated_at) / 3600000;
    if (hoursSinceUpdate < 24) boost += 0.01;
    return { ...r, score: r.score + boost };
  }).sort((a, b) => b.score - a.score);
}
```

---

## 6. 프론트엔드 구현 (프론트 담당)

### 6.1 AI 블록 수정

현재 `AiBlockNodeView.tsx`를 수정:

```diff
- const res = await fetch("/api/ai/basic", { ... });
+ const res = await authFetch(`/api/workspace/docs/${docId}/ai/generate`, {
+   method: "POST",
+   body: JSON.stringify({
+     prompt: prompt.trim(),
+     mode: "generate",
+   }),
+ });
```

**authFetch 전달 경로:**
```
BlockDocumentPage (authFetch 보유)
  → BlockEditor (authFetch prop)
    → AiBlock extension (storage에 authFetch 저장)
      → AiBlockNodeView (extension storage에서 읽기)
```

**방법: Tiptap Extension storage 활용**

```typescript
// ai-block.ts
addStorage() {
  return { authFetch: null as AuthFetchFn | null, docId: null as string | null };
},
```

```typescript
// BlockEditor.tsx
useEffect(() => {
  if (editor && authFetch) {
    editor.storage.aiBlock.authFetch = authFetch;
    editor.storage.aiBlock.docId = docId;
  }
}, [editor, authFetch, docId]);
```

```typescript
// AiBlockNodeView.tsx
const { authFetch, docId } = editor.storage.aiBlock;
```

### 6.2 DocChat UI

**컴포넌트 구조:**

```
BlockDocumentPage
  └─ <section> (에디터 영역)
       ├─ BlockEditor
       └─ DocChatPanel (하단 고정)
            ├─ DocChatToggle ("Ask AI" 버튼)
            ├─ DocChatMessages (메시지 목록)
            │    └─ DocChatMessage
            │         ├─ 마크다운 렌더
            │         ├─ CitationChips (블록 참조 칩)
            │         └─ InsertActions [Insert below] [Replace] [Summary]
            └─ DocChatInput (입력)
```

**모바일:**
- "Ask AI" FAB (고정 버튼) → 탭하면 bottom sheet
- citations 탭 → 해당 블록으로 스크롤 + 하이라이트

**데스크탑:**
- 에디터 하단에 collapsible 패널 (높이 40% max)
- 드래그로 높이 조절 가능

### 6.3 Citation → 블록 하이라이트

```typescript
function scrollToBlock(editor: Editor, anchor: { from: number; to: number }) {
  // ProseMirror selection으로 해당 위치 이동
  editor.chain()
    .focus()
    .setTextSelection(anchor)
    .scrollIntoView()
    .run();

  // 임시 하이라이트 (2초 후 제거)
  const decoration = Decoration.inline(anchor.from, anchor.to, {
    class: "doc-citation-highlight",
  });
  // ... apply via plugin
}
```

### 6.4 Insert 버튼 액션

| 버튼 | 동작 |
|------|------|
| **Insert below** | `editor.commands.insertContentAt(selectionEnd, aiResult)` |
| **Replace selection** | `editor.chain().deleteSelection().insertContent(aiResult).run()` |
| **Create summary** | 문서 맨 아래에 heading + summary 블록 삽입 |

---

## 7. 프롬프트 SSOT (백엔드B 담당)

### 7.1 AI 블록 시스템 프롬프트

```
DOC_GENERATE_SYSTEM = `
You are a document writing assistant inside YUA editor.
Rules:
- Write in the same language as the user's prompt.
- Output clean markdown (no code fences wrapping).
- Be concise and focused on the request.
- Do not add greetings or meta-commentary.
- If context blocks are provided, maintain consistency with them.
`
```

### 7.2 DocChat 시스템 프롬프트

```
DOC_CHAT_SYSTEM = `
You are a document Q&A assistant. Answer questions based ONLY on the provided document blocks.

STRICT RULES:
1. 문서 밖 추측 금지. 답을 모르면 "이 문서에는 해당 내용이 없습니다." 라고 답변.
2. 근거는 반드시 block citations으로만. 각 인용에 [block:{block_id}] 마커 포함.
3. 답변에 인용 포함 (블록 링크/하이라이트용).
4. 답변 언어는 질문 언어를 따름.
5. 마크다운 포맷 사용.

CONTEXT BLOCKS:
{blocks}

USER QUESTION: {question}
`
```

### 7.3 Citation 파싱

AI 응답에서 `[block:abc123]` 패턴을 파싱 → `citations[]` 배열로 변환:

```typescript
function parseCitations(text: string, blockMap: Map<string, BlockInfo>): Citation[] {
  const regex = /\[block:([a-f0-9-]+)\]/g;
  const citations: Citation[] = [];
  let match;
  while ((match = regex.exec(text)) !== null) {
    const blockId = match[1];
    const block = blockMap.get(blockId);
    if (block) {
      citations.push({
        block_id: blockId,
        block_type: block.type,
        content_preview: block.content.slice(0, 200),
        score: block.score,
        anchor: block.anchor,
      });
    }
  }
  return citations;
}
```

---

## 8. 구현 순서 (충돌 방지)

### Phase 1 — 기반 (병렬 가능)

| 담당 | 작업 | 파일 |
|------|------|------|
| **백엔드A** | `document_blocks` 테이블 생성 | `sql/20260306_doc_blocks.sql` |
| **백엔드A** | `doc_chat_messages` 테이블 생성 | `sql/20260306_doc_chat.sql` |
| **백엔드B** | `doc-prompt-builder.ts` 작성 | `src/ai/utils/doc-prompt-builder.ts` |
| **백엔드B** | embedding worker 작성 | `src/workers/embedding-worker.ts` |
| **프론트** | DocChatPanel 컴포넌트 생성 | `src/components/studio/document/editor/DocChatPanel.tsx` |

### Phase 2 — API (순차)

| 담당 | 작업 | 의존성 |
|------|------|--------|
| **백엔드A** | `POST /docs/:docId/ai/generate` 엔드포인트 | doc-prompt-builder |
| **백엔드A** | `POST /docs/:docId/chat` 엔드포인트 | document_blocks + embedding |
| **백엔드B** | `POST /docs/:docId/sync-blocks` 내부 호출 | document_blocks 테이블 |
| **백엔드B** | auto-save 시 sync-blocks 트리거 연결 | 기존 PUT /docs/:docId/content |

### Phase 3 — 프론트 연결 (순차)

| 담당 | 작업 | 의존성 |
|------|------|--------|
| **프론트** | AiBlockNodeView → `/docs/:docId/ai/generate` 연결 | Phase 2 API |
| **프론트** | DocChatPanel → `/docs/:docId/chat` 연결 | Phase 2 API |
| **프론트** | Citation 하이라이트 + Insert 버튼 | DocChatPanel |
| **프론트** | 모바일 bottom sheet + FAB | DocChatPanel |

### Phase 4 — QA

| 검증 항목 | 기준 |
|-----------|------|
| AI 블록 생성 응답 시간 | < 3초 (gpt-4.1-mini TTFT ~200ms) |
| DocChat RAG 정확도 | top-8 블록 중 정답 포함률 > 80% |
| 임베딩 동기화 지연 | block 수정 → 임베딩 반영 < 10초 |
| Citation 앵커 정확도 | 클릭 시 올바른 블록으로 이동 100% |
| 동시 편집 + AI 충돌 | Y.js 동기화 깨지지 않음 |
| Insert 버튼 3종 | 각각 올바른 위치에 삽입 확인 |
| 모바일 DocChat | bottom sheet 열기/닫기, citation 점프 |
| 인코딩 안전 | 한글 문서 임베딩/검색 정상 |
| stale 임베딩 방지 | content_hash 불일치 시 embedding 미적용 |

---

## 9. 파일 충돌 방지 맵

```
백엔드A 전용 (터치 금지: 백엔드B, 프론트):
  yua-backend/src/routes/workspace-router.ts  (엔드포인트 추가)
  yua-backend/sql/20260306_doc_blocks.sql
  yua-backend/sql/20260306_doc_chat.sql

백엔드B 전용:
  yua-backend/src/ai/utils/doc-prompt-builder.ts  (신규)
  yua-backend/src/workers/embedding-worker.ts     (신규)
  yua-backend/src/ai/doc/doc-rag.ts               (신규 - 검색 로직)

프론트 전용:
  yua-web/src/components/studio/document/editor/DocChatPanel.tsx    (신규)
  yua-web/src/components/studio/document/editor/nodes/AiBlockNodeView.tsx
  yua-web/src/components/studio/document/editor/extensions/ai-block.ts
  yua-web/src/components/studio/document/editor/BlockDocumentPage.tsx
  yua-web/src/components/studio/document/editor/BlockEditor.tsx

공유 (수정 시 상호 리뷰):
  yua-shared/src/types/doc-ai.ts  (신규 - 공유 타입)
```

---

## 10. 비용 추정

| 항목 | 단가 | 월 예상 |
|------|------|---------|
| gpt-4.1-mini (생성) | $0.40/1M input, $1.60/1M output | ~$5 (1만 요청 기준) |
| text-embedding-3-small | $0.02/1M tokens | ~$0.3 (10만 블록 기준) |
| pgvector HNSW 메모리 | ~6KB/vector × 1536 dim | ~600MB/10만 블록 |

---

## 11. 2차 확장 (SSE 스트리밍)

1차가 안정화되면:

```
POST /api/workspace/docs/:docId/chat/stream
→ StreamEngine.register(sessionId, traceId)
→ SSE /api/doc/stream?sessionId=X
→ 기존 StreamClient 재사용 (yua-shared)
→ DocChatPanel에서 onToken/onFinal 핸들링
```

기존 `StreamEngine` + `StreamClient`를 그대로 재사용하되,
`threadId` 대신 `sessionId`로 채널 분리.

---

## 12. 체크리스트 (구현 전 확인)

- [ ] pgvector 확장 설치 확인 (`CREATE EXTENSION IF NOT EXISTS vector`)
- [ ] OpenAI API key에 embedding 권한 확인
- [ ] gpt-4.1-mini 모델 접근 확인
- [ ] /mnt/yua 디스크 여유 확인 (embedding worker 로그)
- [ ] PostgreSQL `max_connections` 여유 확인 (worker 커넥션)
- [ ] Redis 큐 설정 (embedding job queue)
