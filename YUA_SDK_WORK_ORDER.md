# YUA SDK 작업 순서서 (컨텍스트 보존용)

> 작성일: 2026-03-08
> 목적: SDK 리빌드 작업 순서 + 컨텍스트 참조 문서

---

## 현재 상태

### 완료
- [x] 레거시 SDK 위치 확인: `/home/dmsal020813/sdk/yua-one-node/` (Node), `yua-one-python/` (Python)
- [x] 레거시를 `/home/dmsal020813/projects/yua-sdk/`로 복사
- [x] spine/ 디렉토리 삭제 (레거시 기능)
- [x] package.json 업데이트 (`@yua/sdk` v0.2.0)
- [x] SDK 설계 문서 완료: `YUA_CONSOLE_SDK_DESIGN.md` Part 3 (OpenAI 스타일)
- [x] 병렬 에이전트 투입 — 백엔드 타입 감사 + yua-shared 타입 검증
- [x] Step 1: 프로젝트 구조 셋업 (디렉토리, tsconfig, pnpm workspace)
- [x] Step 2: 에러 클래스 (APIError, AuthenticationError, RateLimitError, BadRequestError)
- [x] Step 3: HTTP 클라이언트 (api-client.ts — retry, timeout, auth headers)
- [x] Step 4: SSE 스트리밍 (Stream class — AsyncIterable, .on(), .textContent(), .finalMessage())
- [x] Step 5: 응답 타입 (ChatCompletion, ChatCompletionChunk, YUA 확장 타입 전부)
- [x] Step 6: Chat Completions (create — stream/non-stream, SSE→Chunk mapper)
- [x] Step 7: Threads + Messages CRUD
- [x] Step 8: 메인 클라이언트 (YUA class + index.ts exports)
- [x] Step 9: 워크스페이스 통합 + 빌드 성공
- [x] 에이전트 감사 결과 반영:
  - API Key 헤더: Authorization: Bearer → x-api-key (백엔드 실제 구현)
  - eventId 순서 보장: reorder buffer 추가 (StreamEngine monotonic eventId)
  - FINAL vs DONE 구분: 주석 + 로직 반영
  - finalText 필드 처리: final 이벤트에서 전체 텍스트 전달
  - Activity/Suggestion/Memory/Reasoning 집계: finalMessage()에서 yua 확장 반환

### 남은 작업
- [ ] Step 10: 실제 API 테스트 (API Key로 thread → message → stream)
- [ ] npm publish 준비 (private:true 제거, README 작성)
- [ ] Python SDK 리빌드 (Phase 2)
- [ ] 모바일 빌드 대기 중 (newArchEnabled:false, edgeToEdgeEnabled:false 적용)

---

## SDK 리빌드 작업 순서

### Step 1: 프로젝트 구조 셋업
- `yua-sdk/` 를 pnpm workspace에 추가 (`pnpm-workspace.yaml`)
- `tsconfig.json` 업데이트 (ES2020, declaration)
- 디렉토리 구조 생성:
  ```
  src/
    index.ts          -- default export: YUA class
    yua.ts            -- YUA class (메인 클라이언트)
    resources/
      chat/
        completions.ts  -- create() 비스트리밍 + 스트리밍
        threads.ts      -- CRUD
        messages.ts     -- CRUD
        index.ts        -- ChatResource
    core/
      api-client.ts   -- HTTP fetch 래퍼 (retry, timeout, auth)
      streaming.ts    -- Stream<T> AsyncIterable + .on() + .textContent()
      auth.ts         -- API Key / Firebase auth
      error.ts        -- APIError, AuthenticationError, RateLimitError
    types/
      chat.ts         -- ChatCompletion, ChatCompletionChunk
      stream.ts       -- Stream 관련
      shared.ts       -- yua-shared re-export (Phase 2)
  ```

### Step 2: 에러 클래스 (`core/error.ts`)
- `APIError` (status, code, message, requestId)
- `AuthenticationError extends APIError` (401/403)
- `RateLimitError extends APIError` (429, retryAfter)
- `BadRequestError extends APIError` (400)
- 에러 코드 매핑:
  | HTTP | code | 설명 |
  |------|------|------|
  | 401 | invalid_api_key | API Key 무효 |
  | 401 | token_expired | Firebase 토큰 만료 |
  | 429 | rate_limit_exceeded | RPM/TPM 초과 |
  | 429 | compute_gate_busy | 동시 요청 제한 |
  | 402 | insufficient_credits | 크레딧 부족 |

### Step 3: HTTP 클라이언트 (`core/api-client.ts`)
- 레거시 `chat.ts`의 `headers()`, `get()`, `post()` 기반
- retry 로직 (maxRetries, exponential backoff)
- timeout 지원
- Auth header 자동 주입 (API Key or Firebase token)

### Step 4: SSE 스트리밍 (`core/streaming.ts`)
- 레거시 `parseSSEStream()` 코드 활용 — 잘 동작하는 SSE 파서
- `Stream<T>` 클래스:
  - `AsyncIterable<T>` 구현 (`for await`)
  - `.on(event, handler)` — EventEmitter 패턴
  - `.textContent()` — 전체 텍스트 수집 Promise
  - `.finalMessage()` — 완료 후 ChatCompletion 반환
  - `.abort()` — AbortController
  - `.controller` — AbortController 직접 접근

### Step 5: 응답 타입 (`types/chat.ts`)
- `ChatCompletion` — OpenAI 호환 + yua 확장
  ```typescript
  { id, object: "chat.completion", created, model,
    choices: [{ index, message: { role, content }, finish_reason }],
    usage: { prompt_tokens, completion_tokens, total_tokens },
    yua?: { thinking_profile, activities, suggestions, memory_ops, reasoning_blocks }
  }
  ```
- `ChatCompletionChunk` — 스트리밍 청크
  ```typescript
  { id, object: "chat.completion.chunk", created,
    choices: [{ index, delta: { role?, content? }, finish_reason }],
    yua_event?: { type: YuaEventType, data: YuaEventData }
  }
  ```
- `YuaEventType`: stage | activity | reasoning_block | reasoning_done | suggestion | memory | answer_unlocked
- 모델 매핑: yua-fast → FAST, yua-normal → NORMAL, yua-deep → DEEP

### Step 6: Chat Completions (`resources/chat/completions.ts`)
- `create(params)` — stream: false → ChatCompletion
- `create(params, { stream: true })` → Stream<ChatCompletionChunk>
- 내부: POST /api/chat/message + GET /api/stream/stream?threadId= (SSE)
- 백엔드 SSE 이벤트 → ChatCompletionChunk 변환 로직

### Step 7: Threads + Messages CRUD
- `threads.create()`, `threads.list()`, `threads.update()`, `threads.del()`
- `messages.list()`, `messages.create()`
- 백엔드 라우트: POST/GET/PUT/DELETE /api/chat/thread, GET/POST /api/chat/message

### Step 8: 메인 클라이언트 (`yua.ts` + `index.ts`)
- `new YUA({ apiKey })` — API Key 인증
- `new YUA({ authProvider: () => getIdToken() })` — Firebase 인증
- `yua.chat.completions.create()`
- `yua.chat.threads.create()` / `.list()` / `.del()`
- `yua.chat.messages.list()` / `.create()`

---

## 빌드 & 테스트

### Step 9: 워크스페이스 통합
- `pnpm-workspace.yaml`에 `yua-sdk` 추가
- `pnpm install`
- `pnpm --filter @yua/sdk build`

### Step 10: 기본 테스트
- API Key로 thread 생성 → 메시지 전송 → 스트리밍 수신 확인
- 에러 핸들링 테스트 (401, 429)

---

## 참조 문서

| 문서 | 위치 | 내용 |
|------|------|------|
| SDK 설계 (OpenAI 스타일) | `YUA_CONSOLE_SDK_DESIGN.md` Part 3 | 3.4~3.9 섹션 |
| Platform/Admin 설계 | `YUA_PLATFORM_ADMIN_DESIGN.md` | 결제, API Key, 과금 |
| 백엔드 CLAUDE.md | `yua-backend/CLAUDE.md` | 라우트, 인증, DB 구조 |
| yua-shared CLAUDE.md | `yua-shared/CLAUDE.md` | 타입/계약 SSOT |

## 레거시 SDK 위치 (참조용)
- Node: `/home/dmsal020813/sdk/yua-one-node/`
- Python: `/home/dmsal020813/sdk/yua-one-python/`
- SSE 파서 원본: `/home/dmsal020813/sdk/yua-one-node/src/chat.ts` (parseSSEStream, parseNdjsonStream)

## 백엔드 핵심 파일 (SDK 연동)
- Stream router: `yua-backend/src/routes/stream-router.ts`
- Chat router: `yua-backend/src/routes/chat-user.router.ts`
- Stream engine: `yua-backend/src/ai/engines/stream-engine.ts`
- Stream types: `yua-backend/src/types/stream.ts`
- Auth middleware: `yua-backend/src/auth/auth.express.ts`
- Compute gate: `yua-backend/src/ai/compute/compute-gate.ts`

## yua-shared 핵심 타입 (SDK re-export 대상)
- `stream/types.ts` — StreamEventKind, StreamPayload, StreamClientHandlers
- `stream/activity.ts` — ActivityKind, ActivityOp, ActivityItem, ActivityEventPayload
- `stream/stream-stage.ts` — StreamStage enum
- `chat/chat-types.ts` — ChatRole, ChatMessage, ChatThread
- `chat/attachment-types.ts` — AttachmentMeta
- `types/suggestion.ts` — SuggestionItem
- `types/thinkingProfile.ts` — ThinkingProfile, DeepVariant
- `memory/types.ts` — MemoryScope, MemoryStreamOp, MemoryStreamPayload

## 모바일 빌드 수정사항 (대기 중)
- `app.json`: newArchEnabled false, edgeToEdgeEnabled false, reactCompiler false
- `babel.config.js`: reanimated plugin 추가
- `metro.config.js`: 모노레포 watchFolders 추가
- 빌드 명령: `npx eas build --platform android --profile preview --clear-cache`
