# YUA Memory SSE + UI 종합 설계 문서

> 작성일: 2026-03-06
> 상태: DESIGN COMPLETE — 구현 대기

---

## 1. 현재 상태 요약

### 백엔드 메모리 시스템
- ~50개 파일 (`/src/ai/memory/`)
- memory-manager, memory-store, memory-candidate, memory-commit-engine, memory-conflict-detector, memory-dedup, memory-decay, memory-merge 등
- **memory-ack.ts** 존재하지만 어디에도 연결 안 됨 (Phase 9-2에서 만들고 방치)
- DB: PostgreSQL `memory_records`, `cross_thread_memory`, `workspace_memory_state` + MySQL `memory_store` (이중 DB 문제)

### 프론트엔드 메모리 UI
- MemoryPanel (설정) — 잘 만들어짐, CSS 변수 사용
- MemoryDrawer (사이드바) — 기본적, 다크모드 없음, **잘못된 엔드포인트 호출** (CRITICAL)
- MemoryIndicator (토스트) — 고정 하단 우측, SSE 미연결

### API 현황
- `GET /api/memory/list?scope=&limit=`
- `GET /api/memory/summary`
- `PATCH /api/memory/:id`
- `DELETE /api/memory/:id`

---

## 2. QA 감사 결과 (CRITICAL 이슈)

| ID | 심각도 | 이슈 | 파일 |
|----|--------|------|------|
| C1 | CRITICAL | MemoryDrawer가 존재하지 않는 엔드포인트 호출 (`/api/memory/context`, `/project`, `/decision`) | MemoryDrawer.tsx |
| C2 | CRITICAL | MemoryCommitEngine에서 `workspace_id` 누락하여 INSERT | memory-commit-engine.ts:21 |
| C3 | CRITICAL | PostgreSQL과 MySQL 이중 DB — 런타임 메모리와 UI 메모리 완전 분리됨 | memory-store.ts (MySQL) vs memory-manager.ts (PG) |
| C4 | CRITICAL | 에러 메시지에서 내부 정보 노출 (`e.message` 그대로 반환) | memory-router.ts |
| H1 | HIGH | MemoryScope 타입 3곳에서 불일치 (shared vs scope-router vs candidate) | 다수 |
| H2 | HIGH | MemoryRetriever가 `scope: "context"` 하드코딩 — 유효하지 않은 scope | memory-retriever.ts:16 |
| H3 | HIGH | memory-merge가 `user_id`로 필터 (workspace_id 아님) | memory-merge.engine.ts:44 |
| H4 | HIGH | memory-candidate가 항상 `scope: "general_knowledge"` 하드코딩 | memory-candidate.ts:46 |

---

## 3. Memory SSE 설계

### 3.1 스트림 이벤트 (기존 chat SSE에 통합)

별도 SSE 연결 없이 **기존 chat SSE 스트림**에 memory 이벤트 추가.

```typescript
// yua-shared/src/stream/types.ts — StreamEventKind에 추가
| "memory"

// yua-backend/src/types/stream.ts — YuaStreamEventKind에 추가
| "memory"
```

### 3.2 Memory SSE Payload

```typescript
// yua-shared/src/memory/ui-events.ts
export type MemoryStreamOp =
  | "PENDING"    // 후보 감지됨
  | "SAVED"      // DB 커밋 완료
  | "UPDATED"    // 기존 메모리 갱신/병합
  | "CONFLICT"   // 기존 메모리와 충돌
  | "SKIPPED";   // 중복/정책에 의해 스킵

export type MemoryStreamPayload = {
  op: MemoryStreamOp;
  memoryId?: number;
  scope: MemoryScope;
  content: string;          // 200자 truncate
  confidence?: number;
  reason?: string;
  conflictWith?: number;
  mergedInto?: number;
};
```

### 3.3 Emission Points (chat-engine.ts)

| 포인트 | 위치 | op | 조건 |
|--------|------|------|------|
| A | 후보 생성 후 (~line 1777) | PENDING | memoryCandidate != null |
| B | 중복 감지 후 (~line 1876) | SKIPPED | dedupResult.isDuplicate |
| C | commit 성공 후 (~line 1922) | SAVED | MemoryManager.commit 성공 |
| D | 정책 거부 후 (~line 1930) | SKIPPED | decision === reject |
| E | 충돌 감지 시 | CONFLICT | detectMemoryConflict.hasConflict |

### 3.4 RAG 요약 (메시지 완료 시점)

`done` 이벤트 직후, 해당 대화에서 생성된 메모리 요약을 `memory` 이벤트로 일괄 emit:

```typescript
// chat-engine.ts — done 이벤트 emit 후
if (memoryResults.length > 0) {
  for (const result of memoryResults) {
    await StreamEngine.publish(threadId, {
      event: "memory",
      traceId,
      memory: {
        op: "SAVED",
        memoryId: result.id,
        scope: result.scope,
        content: result.content.slice(0, 200),
        confidence: result.confidence,
      },
    });
  }
}
```

---

## 4. 신규/개선 API

### 4.1 신규 엔드포인트 (memory-router.ts)

| Method | Path | 설명 |
|--------|------|------|
| GET | `/api/memory/search?q=&scopes=&minConfidence=&sortBy=&limit=&offset=` | 검색 + 필터 |
| POST | `/api/memory/bulk-delete` | `{ ids: number[] }` 일괄 삭제 |
| POST | `/api/memory/bulk-lock` | `{ ids: number[], locked: boolean }` 일괄 잠금 |
| GET | `/api/memory/export?format=json\|csv` | 메모리 내보내기 |
| GET | `/api/memory/:id/history` | 버전 이력 |
| GET | `/api/memory/thread/:threadId` | 해당 스레드에서 생성된 메모리 |

### 4.2 기존 엔드포인트 개선

`GET /api/memory/list` 에 추가:
- `sortBy=confidence|updated_at|created_at|access_count`
- `sortOrder=asc|desc`
- `minConfidence=0.5`
- `locked=true|false`
- `offset=0` (페이지네이션)
- `q=searchterm` (ILIKE 텍스트 필터)

---

## 5. DB 스키마 변경

### 5.1 신규 테이블: memory_version_logs

```sql
CREATE TABLE memory_version_logs (
  id            BIGSERIAL PRIMARY KEY,
  memory_id     BIGINT NOT NULL REFERENCES memory_records(id),
  workspace_id  UUID NOT NULL,
  version       INTEGER NOT NULL DEFAULT 1,
  content       TEXT NOT NULL,
  confidence    NUMERIC(5,4) NOT NULL,
  changed_by    VARCHAR(32) NOT NULL,
  change_reason TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_memory_version UNIQUE(memory_id, version)
);
```

### 5.2 memory_records 컬럼 추가

```sql
ALTER TABLE memory_records ADD COLUMN version INTEGER NOT NULL DEFAULT 1;
```

### 5.3 인덱스 추가

```sql
CREATE INDEX CONCURRENTLY idx_memory_records_ws_scope_active
  ON memory_records(workspace_id, scope, is_active, confidence DESC)
  WHERE is_active = true;

CREATE INDEX CONCURRENTLY idx_memory_records_content_trgm
  ON memory_records USING gin (content gin_trgm_ops);

CREATE INDEX CONCURRENTLY idx_memory_records_decay_scan
  ON memory_records(confidence, is_active, locked)
  WHERE is_active = true AND locked = false;
```

---

## 6. 프론트엔드 UI 설계

### 6.1 통합 Zustand 스토어 (useMemoryStore.ts — NEW)

기존 `useMemoryIndicator` + `useMemoryDrawer`를 하나로 통합:
- indicatorState, pendingCount, savedCount, recentSaves
- drawerOpen, drawerMode ("full" | "mini"), activeScopes, searchQuery
- threadMemories (Map), conflicts, selectedIds, bulkMode

### 6.2 컴포넌트 맵

| 컴포넌트 | 상태 | 설명 |
|---------|------|------|
| `MemoryCard` | NEW | 재사용 카드 (panel/drawer/compact 변형), scope 배지, confidence 바, 액션 |
| `MemorySearchBar` | NEW | 검색 + scope 필터 칩 (multi-select) + confidence 범위 |
| `MemoryDrawer` | REWRITE | 슬라이드인 패널, 다크모드, SSE 실시간 업데이트, DeepThinkingDrawer 패턴 |
| `MemoryIndicator` | REWRITE | ChatInput 옆 인라인, 펄스 애니메이션, 클릭 시 미니 드로어 |
| `MemoryBadge` | NEW | 메시지에 "기억됨" 배지, 클릭 시 팝오버 |
| `MemoryConflictModal` | NEW | 충돌 해결 UI (기존 유지/교체/병합/무시) |
| `MemoryTimeline` | NEW | 시간순 메모리 변경 타임라인 |
| `MemoryEmptyState` | NEW | 빈 상태 일러스트 |
| `MemoryPanel` | REWRITE | 설정 내 패널, 검색/필터/bulk 액션 추가 |

### 6.3 Scope 배지 색상

```
user_profile:         blue
user_preference:      purple
user_research:        amber
project_architecture: emerald
project_decision:     rose
general_knowledge:    slate
```

### 6.4 애니메이션 스펙

- **Drawer 슬라이드인**: spring(damping:25, stiffness:300)
- **Memory 저장 플래시**: bg 하이라이트 0.6s ease-out
- **Indicator 펄스**: box-shadow 1.2s infinite (pending 시)
- **카드 진입**: opacity+y 0.2s ease-out
- **Scope 접기**: height 0.25s

### 6.5 반응형

| 뷰포트 | Drawer | Panel | Indicator |
|--------|--------|-------|-----------|
| Desktop (>=1024px) | 그리드 컬럼 380px | max-w-2xl | ChatInput 좌측 |
| Tablet (768-1023px) | 오버레이 360px | 전체 너비 | ChatInput 좌측 |
| Mobile (<768px) | 풀스크린 바텀시트 | 전체 너비 | ChatInput 위 |

---

## 7. 구현 순서 (5 Phase)

### Phase 1: 기반 (1-2일)
- yua-shared: MemoryStreamPayload, 확장된 api-types, ui-events
- yua-shared/stream: "memory" 이벤트 추가
- yua-backend/types/stream.ts: "memory" 추가
- StreamEngine.publish() memory 가드 추가
- CRITICAL 버그 수정 (C1-C4)

### Phase 2: SSE 통합 (1-2일)
- chat-engine.ts에 PENDING/SAVED/SKIPPED/CONFLICT emit 포인트 연결
- memory-stream-emitter.ts 헬퍼 생성
- 프론트: useChatStream에 memory 이벤트 핸들러 추가
- 프론트: useMemoryStore 통합 스토어 생성

### Phase 3: API + 원자 컴포넌트 (2-3일)
- 백엔드: search, bulk, export, history, thread 엔드포인트
- 프론트: MemoryCard, MemorySearchBar, MemoryEmptyState, MemoryBadge
- 프론트: memory.ts API 클라이언트 확장

### Phase 4: 패널 + 드로어 리라이트 (2-3일)
- MemoryPanel 리라이트 (검색, 필터, bulk)
- MemoryDrawer 리라이트 (슬라이드인, 다크모드, SSE)
- MemoryIndicator 리라이트 (인라인, 애니메이션)
- ChatMain에 MemoryIndicator 마운트

### Phase 5: 고급 기능 (2-3일)
- MemoryConflictModal
- MemoryTimeline
- Decay 정책 확장 (6 scope 전체)
- Redis 캐싱 레이어
- 버전 이력 테이블 + UI
- Rate limiting

---

## 8. 핵심 변경 파일

### yua-shared
- `src/memory/ui-events.ts` — MemoryStreamOp, MemoryStreamPayload
- `src/memory/api-types.ts` — search/bulk/export/history 타입
- `src/memory/types.ts` — MemoryConflict, MemoryThreadSummary
- `src/stream/types.ts` — "memory" 이벤트, onMemory 핸들러

### yua-backend
- `src/types/stream.ts` — "memory" 추가
- `src/ai/engines/chat-engine.ts` — SSE emit 5개 포인트
- `src/ai/engines/stream-engine.ts` — memory 가드
- `src/routes/memory-router.ts` — 6개 신규 엔드포인트
- `src/ai/memory/memory-commit-engine.ts` — workspace_id 수정 (CRITICAL)
- `src/ai/memory/memory-conflict-detector.ts` — V2 (임베딩 기반)
- `src/ai/memory/memory-decay-engine.ts` — 6 scope 정책
- `src/ai/memory/memory-merge.engine.ts` — workspace_id 정렬
- NEW: `src/ai/memory/memory-stream-emitter.ts`
- MIGRATION: memory_version_logs 테이블

### yua-web
- NEW: `src/store/useMemoryStore.ts`
- NEW: `src/components/memory/MemoryCard.tsx`
- NEW: `src/components/memory/MemorySearchBar.tsx`
- NEW: `src/components/memory/MemoryEmptyState.tsx`
- NEW: `src/components/memory/MemoryConflictModal.tsx`
- NEW: `src/components/memory/MemoryTimeline.tsx`
- NEW: `src/components/chat/MemoryBadge.tsx`
- REWRITE: `src/components/memory/MemoryDrawer.tsx`
- REWRITE: `src/components/chat/MemoryIndicator.tsx`
- REWRITE: `src/components/settings/panels/MemoryPanel.tsx`
- EXTEND: `src/lib/api/memory.ts`
- EXTEND: `src/hooks/useChatStream.ts`
- EXTEND: `src/app/globals.css`
