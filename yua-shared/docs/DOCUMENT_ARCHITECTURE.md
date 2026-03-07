# YUA Document System - Architecture Design (SSOT)

> 작성일: 2026-03-06
> 상태: DESIGN (구현 전)

---

## 0. 기존 인프라 현황 분석

### 0.1 현재 DB 테이블 (PostgreSQL - yua_ai)

| 테이블 | 역할 | 비고 |
|--------|------|------|
| `workspace_docs` | 문서 메타 (id UUID, workspace_id, project_id, title, icon, is_locked, locked_by, created_by, last_edited_by, deleted_at) | soft delete 지원 |
| `workspace_doc_revisions` | 리비전 (id serial, doc_id, snapshot_id, version int, editor_user_id, summary, created_at) | version 기반 낙관적 잠금 |
| `workspace_doc_snapshots` | Y.js 상태 스냅샷 (id serial, doc_id, version, ydoc_state bytea, state_hash, created_by) | 현재 plain text를 base64로 저장 |
| `workspace_doc_calendar_notes` | 문서별 달력 메모 (doc_id, note_date, memo, upsert on conflict) | 부가 기능 |

### 0.2 현재 백엔드 (yua-backend)

- **WebSocket**: `/ws/docs?docId=&token=` -- cursor/presence 공유 + doc_op 전송 (`workspace-docs-ws.ts`)
- **Collab Repo**: `WorkspaceDocCollabRepo` -- version conflict 감지, snapshot/revision INSERT, row-level lock (`FOR UPDATE`)
- **Presence**: `WorkspaceDocPresenceRedis` -- Redis sorted set + per-client key, TTL 45s, cursor broadcast via pub/sub
- **WS Token**: HMAC-SHA256 기반 자체 토큰 (DOC_WS_SECRET), 3분 기본 TTL
- **REST API** (workspace-router.ts, `/api/workspace/` 하위):
  - `GET /docs` -- 문서 목록
  - `POST /docs` -- 문서 생성
  - `GET /docs/:docId` -- 문서 단건 조회
  - `PATCH /docs/:docId` -- 제목 수정
  - `GET /docs/:docId/snapshot/latest` -- 최신 스냅샷
  - `GET /docs/:docId/snapshot/by-version/:version` -- 특정 버전 스냅샷
  - `GET /docs/:docId/revisions` -- 리비전 이력
  - `GET|PATCH /docs/:docId/lock` -- 문서 잠금
  - `GET|POST /docs/:docId/calendar-notes` -- 달력 메모
  - `POST /docs/:docId/ws-token` -- WebSocket 연결 토큰

### 0.3 현재 프론트엔드 (yua-web)

- **페이지**: `/studio/document` -> `DocumentCollabPage.tsx`
- **에디터**: raw `<textarea>` + ReactMarkdown 프리뷰 (3-panel 레이아웃)
- **실시간**: WebSocket 연결, text patch 기반 동기화, heartbeat 15s
- **기능**: 문서 CRUD, 리비전 복원, 잠금, 달력 메모, 번역, 편집 제안(하드코딩)

### 0.4 핵심 한계점

1. **plain text 저장** -- 블록 구조 없음, 서식 정보 손실
2. **textarea 에디터** -- 리치 텍스트 불가, 블록 조작 불가
3. **text patch CRDT 없음** -- `buildSingleReplacePatch`는 단순 diff, 동시 편집 시 충돌 위험
4. **서브페이지/계층 없음** -- flat 문서 목록만 존재
5. **공유/권한 세분화 없음** -- workspace role만 적용

---

## 1. DB 스키마 설계 (PostgreSQL)

### 1.1 기존 테이블 확장: `workspace_docs`

```sql
ALTER TABLE workspace_docs
  ADD COLUMN IF NOT EXISTS parent_document_id UUID REFERENCES workspace_docs(id),
  ADD COLUMN IF NOT EXISTS cover_url          TEXT,
  ADD COLUMN IF NOT EXISTS visibility         TEXT NOT NULL DEFAULT 'workspace'
    CHECK (visibility IN ('private', 'workspace', 'public')),
  ADD COLUMN IF NOT EXISTS archived           BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS content_type       TEXT NOT NULL DEFAULT 'markdown'
    CHECK (content_type IN ('markdown', 'blocks')),
  ADD COLUMN IF NOT EXISTS position           REAL NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_workspace_docs_parent
  ON workspace_docs (parent_document_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_workspace_docs_position
  ON workspace_docs (workspace_id, parent_document_id, position)
  WHERE deleted_at IS NULL;
```

마이그레이션 전략: `content_type = 'markdown'`인 기존 문서는 기존 textarea 에디터로 계속 동작. 새 문서는 `content_type = 'blocks'`로 생성.

### 1.2 신규 테이블: `document_blocks`

```sql
CREATE TABLE document_blocks (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id      UUID NOT NULL REFERENCES workspace_docs(id) ON DELETE CASCADE,
  parent_block_id  UUID REFERENCES document_blocks(id) ON DELETE CASCADE,
  type             TEXT NOT NULL DEFAULT 'paragraph'
    CHECK (type IN (
      'paragraph', 'heading_1', 'heading_2', 'heading_3',
      'bullet_list', 'numbered_list', 'todo',
      'toggle', 'code', 'quote', 'callout',
      'image', 'divider', 'table', 'embed',
      'math', 'mermaid', 'bookmark',
      'column_list', 'column',
      'synced_block', 'synced_block_ref',
      'ai_block'
    )),
  content          JSONB NOT NULL DEFAULT '{}',
  properties       JSONB NOT NULL DEFAULT '{}',
  position         TEXT NOT NULL DEFAULT 'a0',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_document_blocks_doc
  ON document_blocks (document_id, position);
CREATE INDEX idx_document_blocks_parent
  ON document_blocks (parent_block_id, position);
CREATE INDEX idx_document_blocks_synced
  ON document_blocks (type, (properties->>'source_block_id'))
  WHERE type = 'synced_block_ref';
```

- `content`: ProseMirror JSON 호환 리치 텍스트 (inline marks: bold, italic, underline, strikethrough, code, link, color, highlight, mention)
- `properties`: 블록 타입별 속성 (code -> language, image -> url/caption/width, toggle -> collapsed, callout -> emoji/color, todo -> checked, embed -> url/provider, ai_block -> prompt/status/model)
- `position`: fractional indexing 문자열 (재정렬 시 다른 블록 UPDATE 불필요)

### 1.3 신규 테이블: `workspace_doc_updates` (WAL)

```sql
CREATE TABLE workspace_doc_updates (
  id               BIGSERIAL PRIMARY KEY,
  doc_id           UUID NOT NULL REFERENCES workspace_docs(id) ON DELETE CASCADE,
  update           BYTEA NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_workspace_doc_updates_doc
  ON workspace_doc_updates (doc_id, id);
```

**WAL(Write-Ahead Log) 패턴:**
- 모든 Y.js incremental update → **즉시** `workspace_doc_updates`에 append (손실 0)
- `workspace_doc_snapshots`는 **30초마다** compaction용 전체 스냅샷 저장
- 서버 복구 시: `마지막 snapshot` + `이후 updates replay` → Y.Doc 완전 복원
- Compaction 후 해당 snapshot 이전의 updates는 DELETE (디스크 절약)

**서버 crash 시나리오 검증:**
```
t=0s   snapshot v5 저장됨
t=10s  update #101 append (즉시 DB)
t=15s  update #102 append (즉시 DB)
t=20s  서버 crash!
---
복구:
1. snapshot v5 로드 (t=0s 시점)
2. updates #101, #102 replay
3. Y.Doc = crash 직전 상태 (손실 0)
```

**WAL 없이 snapshot만 쓸 경우:**
```
t=0s   snapshot v5 저장됨
t=10s  편집 (메모리에만 존재)
t=15s  편집 (메모리에만 존재)
t=20s  서버 crash!
---
복구:
1. snapshot v5 로드 (t=0s 시점)
2. t=0~20s 편집 20초분 전부 손실!
```

### 1.4 신규 테이블: `document_comments`

```sql
CREATE TABLE document_comments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id      UUID NOT NULL REFERENCES workspace_docs(id) ON DELETE CASCADE,
  block_id         UUID REFERENCES document_blocks(id) ON DELETE SET NULL,
  text_range       JSONB,
  user_id          INT NOT NULL,
  content          TEXT NOT NULL,
  parent_comment_id UUID REFERENCES document_comments(id) ON DELETE CASCADE,
  resolved         BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_by      INT,
  resolved_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at       TIMESTAMPTZ
);

CREATE INDEX idx_document_comments_doc
  ON document_comments (document_id, created_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_document_comments_block
  ON document_comments (block_id, created_at) WHERE deleted_at IS NULL;
```

### 1.5 신규 테이블: `document_history`

```sql
CREATE TABLE document_history (
  id               BIGSERIAL PRIMARY KEY,
  document_id      UUID NOT NULL REFERENCES workspace_docs(id) ON DELETE CASCADE,
  user_id          INT NOT NULL,
  action           TEXT NOT NULL
    CHECK (action IN (
      'block_create', 'block_update', 'block_delete', 'block_move',
      'blocks_reorder', 'meta_update', 'full_snapshot'
    )),
  payload          JSONB NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_document_history_doc
  ON document_history (document_id, created_at DESC);
```

### 1.6 신규 테이블: `document_shares`

```sql
CREATE TABLE document_shares (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id      UUID NOT NULL REFERENCES workspace_docs(id) ON DELETE CASCADE,
  shared_with_user_id INT,
  role             TEXT NOT NULL DEFAULT 'viewer'
    CHECK (role IN ('editor', 'commenter', 'viewer')),
  token            TEXT UNIQUE,
  expires_at       TIMESTAMPTZ,
  password_hash    TEXT,
  created_by       INT NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_document_shares_doc ON document_shares (document_id);
CREATE UNIQUE INDEX idx_document_shares_user
  ON document_shares (document_id, shared_with_user_id) WHERE shared_with_user_id IS NOT NULL;
CREATE INDEX idx_document_shares_token ON document_shares (token) WHERE token IS NOT NULL;
```

### 1.7 ER 다이어그램

```
workspace_docs (기존 + 확장)
  |-- 1:N --> workspace_doc_updates (WAL - 즉시 append)
  |-- 1:N --> workspace_doc_snapshots (기존 유지 - 30초 compaction)
  |-- 1:N --> document_blocks
  |             |-- self-ref --> parent_block_id (중첩)
  |-- 1:N --> document_comments
  |             |-- FK --> block_id (optional)
  |             |-- self-ref --> parent_comment_id (스레드)
  |-- 1:N --> document_history
  |-- 1:N --> document_shares
  |-- 1:N --> workspace_doc_revisions (기존 유지)
  |-- 1:N --> workspace_doc_calendar_notes (기존 유지)
  |-- self-ref --> parent_document_id (서브페이지)
```

---

## 2. API 엔드포인트 설계

### 2.1 기존 유지 (변경 없음)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/workspace/docs` | 문서 목록 |
| POST | `/api/workspace/docs` | 문서 생성 |
| GET | `/api/workspace/docs/:docId` | 문서 단건 |
| PATCH | `/api/workspace/docs/:docId` | 문서 메타 수정 |
| GET | `/api/workspace/docs/:docId/snapshot/latest` | 최신 스냅샷 |
| GET | `/api/workspace/docs/:docId/snapshot/by-version/:v` | 버전별 스냅샷 |
| GET | `/api/workspace/docs/:docId/revisions` | 리비전 목록 |
| GET/PATCH | `/api/workspace/docs/:docId/lock` | 잠금 |
| GET/POST | `/api/workspace/docs/:docId/calendar-notes` | 달력 메모 |
| POST | `/api/workspace/docs/:docId/ws-token` | WS 토큰 |

### 2.2 기존 확장

```
PATCH  /api/workspace/docs/:docId
  + body: { title?, icon?, cover_url?, visibility?, archived? }

DELETE /api/workspace/docs/:docId
  soft delete (SET deleted_at = now())

POST   /api/workspace/docs
  + body: { title?, projectId?, parentDocumentId?, contentType? }
  contentType: "markdown" | "blocks" (기본: "blocks")
```

### 2.3 블록 CRUD (신규)

```
GET    /api/workspace/docs/:docId/blocks
POST   /api/workspace/docs/:docId/blocks
PATCH  /api/workspace/docs/:docId/blocks/:blockId
DELETE /api/workspace/docs/:docId/blocks/:blockId
POST   /api/workspace/docs/:docId/blocks/reorder
POST   /api/workspace/docs/:docId/blocks/batch
```

### 2.4 코멘트 (신규)

```
GET    /api/workspace/docs/:docId/comments
POST   /api/workspace/docs/:docId/comments
PATCH  /api/workspace/docs/:docId/comments/:commentId
DELETE /api/workspace/docs/:docId/comments/:commentId
```

### 2.5 히스토리 (신규)

```
GET    /api/workspace/docs/:docId/history
POST   /api/workspace/docs/:docId/history/restore
```

### 2.6 공유 (신규)

```
GET    /api/workspace/docs/:docId/shares
POST   /api/workspace/docs/:docId/shares
PATCH  /api/workspace/docs/:docId/shares/:shareId
DELETE /api/workspace/docs/:docId/shares/:shareId
GET    /api/d/:token                              (public link, 인증 불필요)
```

### 2.7 AI 통합 (신규)

```
POST   /api/workspace/docs/:docId/ai/generate-block   (SSE)
POST   /api/workspace/docs/:docId/ai/summarize
POST   /api/workspace/docs/:docId/ai/translate
POST   /api/workspace/docs/:docId/ai/rewrite-block     (SSE)
```

---

## 3. 실시간 협업 아키텍처

### 3.1 기존 WebSocket 확장

기존 `workspace-docs-ws.ts`의 인증/룸/Redis 인프라를 그대로 활용한다.

신규 메시지 타입 추가:
```
{ type: "yjs_sync",   data: "<base64 Uint8Array>" }   -- Y.js sync step
{ type: "yjs_update", data: "<base64 Uint8Array>" }   -- Y.js incremental update
{ type: "awareness",  data: "<base64 Uint8Array>" }   -- Y.js awareness (커서/선택)
```

기존 메시지 유지 (markdown 모드 하위호환):
```
{ type: "heartbeat" }
{ type: "cursor", cursor }
{ type: "doc_op", op }
```

### 3.2 서버사이드 Y.js 문서 + WAL 영속화

```
클라이언트 A -----> WS Server + Y.Doc (in-memory) --+--> workspace_doc_updates (즉시 append)
클라이언트 B ----->        |                         |
클라이언트 C ----->        +--> Redis pub/sub        +--> workspace_doc_snapshots (30초 compaction)
```

**실시간 흐름:**
1. 클라이언트 접속 시 DB에서 `최신 snapshot` + `이후 updates` 로드 -> Y.Doc replay
2. 클라이언트의 Y.js update를 Y.Doc에 merge -> 다른 클라이언트에 broadcast
3. **즉시**: 모든 update를 `workspace_doc_updates`에 INSERT (WAL)
4. **30초마다 또는 1000 updates 누적 시**: snapshot 생성 -> `workspace_doc_snapshots` INSERT
5. **Compaction**: snapshot 생성 직후, 해당 snapshot 이전의 updates DELETE
6. 모든 클라이언트 퇴장 시 최종 snapshot 저장 + 남은 updates 정리 + 메모리 해제
7. Redis 채널 `yua:wsdocs:v2:yjs:doc:<docId>`로 멀티서버 릴레이

**Compaction 전략:**
```sql
-- 1) snapshot 생성
INSERT INTO workspace_doc_snapshots (doc_id, version, ydoc_state, state_hash, created_by)
VALUES ($1, $2, $3, $4, $5)
RETURNING id, created_at;

-- 2) snapshot 이전 updates 삭제 (같은 트랜잭션)
DELETE FROM workspace_doc_updates
WHERE doc_id = $1 AND created_at < $snapshot_created_at;
```

**Compaction 트리거 조건 (OR):**
- 마지막 snapshot 이후 30초 경과
- `workspace_doc_updates`에 해당 doc의 미compacted row가 1000개 이상
- 마지막 클라이언트 퇴장 시 (flush)

**updates 테이블 크기 검증:**
```
평균 Y.js update 크기: ~200 bytes (텍스트 1-2자 편집)
1000 updates = ~200KB (compaction 직전 최대치)
compaction 후 = 0 rows (snapshot으로 압축됨)
→ 테이블 무한 증가 불가. 항상 최대 1000 rows/doc 유지
```

**서버 crash 복구:**
```
1. SELECT ydoc_state FROM workspace_doc_snapshots
   WHERE doc_id = $1 ORDER BY version DESC LIMIT 1;
2. SELECT update FROM workspace_doc_updates
   WHERE doc_id = $1 AND id > (snapshot 시점) ORDER BY id;
3. Y.Doc.applyUpdate(snapshot)
4. for each update: Y.Doc.applyUpdate(update)
5. 결과: crash 직전 상태 100% 복원 (WAL이므로 손실 0)
```

### 3.3 Y.js CRDT가 핵심

블록 수준 잠금 불필요. Y.js가 operation 기반 CRDT로 자동 충돌 해소. Awareness Protocol로 커서 위치 + 선택 영역 + 유저 색상 공유.

### 3.4 DB 동기화

`document_blocks` 테이블은 REST API 조회용 "materialized view" 역할.

**SSOT 체인**: `workspace_doc_updates` (WAL) + `workspace_doc_snapshots` (compacted) → Y.Doc (in-memory) → `document_blocks` (materialized view)

---

## 4. 프론트엔드 에디터 아키텍처

### 4.1 에디터 엔진 비교

| 기준 | Tiptap | BlockNote | Novel | Plate |
|------|--------|-----------|-------|-------|
| 기반 | ProseMirror | Tiptap 래퍼 | Tiptap 래퍼 | Slate.js |
| 블록 모델 | 확장 필요 | 내장 (Notion 스타일) | 간소화 | 내장 |
| Y.js 통합 | y-prosemirror (성숙) | 내장 | 내장 | slate-yjs (불안정) |
| 커스텀 블록 | 매우 유연 | 가능하나 제약 | 제한적 | 유연 |
| 슬래시 커맨드 | 확장으로 구현 | 내장 | 내장 | 확장으로 구현 |
| 드래그 앤 드롭 | 확장 필요 | 내장 | 제한적 | 확장 필요 |
| 번들 크기 | ~150KB | ~200KB | ~100KB | ~250KB |
| 커뮤니티 | 매우 활발 | 활발 | 소규모 | 활발 |
| 학습 곡선 | 중간 | 낮음 | 낮음 | 높음 |
| 테이블 | @tiptap/extension-table | 기본 | 미지원 | 기본 |
| 수학/Mermaid | 확장으로 추가 | 미지원 | 미지원 | 확장으로 추가 |

### 4.2 추천: Tiptap (1순위)

1. **ProseMirror 기반**: 가장 안정적이고 성숙한 에디터 프레임워크
2. **Y.js 통합 완성도**: `y-prosemirror`는 프로덕션 검증 완료
3. **확장성**: 커스텀 블록(ai_block, mermaid, math) 추가가 자유로움
4. **기존 인프라 호환**: WebSocket 기반 Y.js 프로바이더와 자연스럽게 연결
5. **Headless**: UI를 Tailwind로 완전 커스텀 가능 (YUA 디자인 시스템 적용)

BlockNote의 블록 드래그 앤 드롭, 슬래시 커맨드 UX를 참고하되, Tiptap 위에서 직접 구현하는 것이 최적.

### 4.3 에디터 컴포넌트 구조

```
src/components/studio/document/
  |-- DocumentCollabPage.tsx        (기존 - markdown 모드용 유지)
  |-- BlockDocumentPage.tsx         (신규 - 블록 에디터 메인)
  |-- editor/
  |     |-- BlockEditor.tsx
  |     |-- BlockEditorToolbar.tsx
  |     |-- SlashCommandMenu.tsx
  |     |-- BlockHandle.tsx
  |     |-- CollabCursors.tsx
  |     |-- extensions/
  |     |     |-- ai-block.ts
  |     |     |-- math-block.ts
  |     |     |-- mermaid-block.ts
  |     |     |-- callout-block.ts
  |     |     |-- bookmark-block.ts
  |     |     |-- todo-block.ts
  |     |-- yjs/
  |           |-- yjs-provider.ts
  |           |-- yjs-sync.ts
  |-- sidebar/
        |-- DocTreeSidebar.tsx
        |-- CommentsSidebar.tsx
        |-- HistorySidebar.tsx
        |-- ShareDialog.tsx
```

---

## 5. AI 통합 포인트

### 5.1 채팅 -> 문서 생성
채팅 AI 엔진에 `create_document` tool call 추가. 블록 배열을 생성하여 문서 + 블록 일괄 생성.

### 5.2 에디터 내 AI 블록
슬래시 커맨드 `/ai` -> `ai_block` 생성 -> SSE 스트리밍으로 콘텐츠 생성 -> "적용" 시 일반 블록으로 변환.

### 5.3 슬래시 커맨드 목록
`/ai`, `/ai-summarize`, `/ai-translate`, `/ai-expand`, `/ai-rewrite`, `/ai-table`, `/ai-code`, `/ai-mermaid`

---

## 6. 마이그레이션 전략

### Phase 0: 준비
- DB ALTER TABLE + CREATE TABLE
- `yua-shared`에 블록 타입 정의 추가
- Tiptap 패키지 설치

### Phase 1: 블록 에디터 MVP
- BlockDocumentPage + Tiptap + 블록 CRUD API
- content_type 분기로 기존 markdown 문서 공존

### Phase 2: 실시간 협업
- WebSocket Y.js 메시지 타입 추가
- 서버사이드 Y.Doc + Redis 릴레이

### Phase 3: 고급 기능
- 코멘트, 공유, AI 블록, 서브페이지/트리, 변경 이력 복원

---

## 7. 기술 의사결정 요약

| 항목 | 결정 | 근거 |
|------|------|------|
| 에디터 엔진 | Tiptap (ProseMirror) | Y.js 통합 성숙도, 확장성, headless UI |
| CRDT | Y.js | ProseMirror 바인딩 완성도, 커뮤니티 |
| 블록 저장 | JSONB (content, properties) | 유연한 스키마, PostgreSQL JSONB 인덱싱 |
| 정렬 | Fractional Indexing (text) | 재정렬 시 다른 블록 UPDATE 불필요 |
| 영속화 | WAL (updates 즉시) + Snapshot (30초/1000건 compaction) | crash 시 손실 0, 테이블 무한증가 방지 |
| SSOT | Y.Doc snapshot + WAL updates | 블록 테이블은 조회용 materialized view |
| 실시간 | 기존 WebSocket 확장 | 인증/룸/Redis 인프라 재사용 |
| AI 통합 | 기존 AI provider + SSE | Claude/GPT/Gemini 선택 가능 |
| 마이그레이션 | content_type 분기 | 기존 markdown 문서 하위호환 |

---

## 8. yua-shared 타입 정의 (추후 구현)

`yua-shared/src/document/block.types.ts`에 `BlockType`, `RichTextNode`, `BlockContent`, `Block`, `DocumentMeta`, `DocumentVisibility`, `DocumentContentType`, `ShareRole` 타입을 정의.
