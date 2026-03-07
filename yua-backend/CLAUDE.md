# yua-backend — CLAUDE SSOT

## 절대 규칙
- pnpm 전역 설치 금지 (루트 `packageManager: pnpm@10.26.2` 준수)
- deps 변경: `pnpm --filter yua-backend add <dep>`
- 공유 타입/계약은 `yua-shared`에서만 정의 (절대 복제 금지)

## Stack
- Express 4.18.2 + TypeScript (ES2020, Node16)
- PostgreSQL (Prisma) + MySQL + Redis
- Firebase Admin (인증)
- AI: Claude SDK, OpenAI, Gemini
- WebSocket (voice, docs collaboration)

## Dev/Build
```bash
pnpm --filter yua-backend dev     # tsx watch src/bootstrap.ts
pnpm --filter yua-backend build   # tsc → dist/
pnpm --filter yua-backend start   # node dist/server/server.js
```
- 서버 포트: `0.0.0.0:4000`
- PM2: `ecosystem.config.js`

## 아키텍처 개요

### 서버 진입점
- `src/bootstrap.ts` → `src/server/server.ts`
- ETag 비활성화 (SSE 버퍼링 방지)
- Trust proxy (Next.js rewrite 대응)
- CORS: `origin: "*"`
- Body limit: 10MB

### DB 구조
| DB | 용도 | 연결 |
|----|------|------|
| PostgreSQL | 메인 (instances, chat, workspace, projects) | `127.0.0.1:5432` / yua_ai / pgvector |
| MySQL | VM/스냅샷, 유저 테이블 | `127.0.0.1:3306` / yuaai |
| Redis | 캐시, presence, rate limit | `127.0.0.1:6379` |

### Prisma 스키마
- `src/prisma/schema.engine.prisma` — PostgreSQL (instances, chat, workspace, projects)
- `src/prisma/schema.vm.prisma` — MySQL (VM, snapshots, stream events)

### 주요 테이블 (PostgreSQL)
- `chat_threads`, `chat_messages` — 채팅 (trace_id로 추적)
- `workspaces`, `workspace_users`, `workspace_memory_state`
- `projects`, `project_members`
- `engine_instances`, `instance_engines`, `instance_policies`
- Tier 테이블: `cpu_tiers`, `node_tiers`, `engine_tiers`, `qpu_tiers`, `omega_tiers`

## 인증 흐름 (SSOT)
```
Authorization: Bearer <firebase-id-token>
→ requireFirebaseAuth (middleware)
  → firebaseAuth.verifyIdToken()
  → MySQL users 테이블 조회 (firebase_uid)
  → req.user = { userId, firebaseUid, email, name, role }
→ withWorkspace (middleware)
  → x-workspace-id 헤더 → workspace role 조회
  → 없으면 personal workspace 자동 생성
  → req.workspace = { id, role }
```

### Express.User 타입
```typescript
{
  userId: number;        // MySQL user ID (SSOT)
  id: number;            // alias
  firebaseUid: string;
  email: string | null;
  name: string | null;
  role?: string;         // 'user' | 'admin'
  authProvider?: "google" | "email" | null;
}
```

### Workspace Roles
`owner` | `admin` | `member` | `viewer`

## 미들웨어 스택 (순서 중요)
```
autoEngineDB → requireFirebaseAuth → withWorkspace → checkUsageLimit → aiEngineLimiter → rateLimit → router
```

## 라우트 구조 (`src/routes/index.ts`)

### Public (인증 불필요)
- `/health`, `/auth`

### Auth Required
- `/me`, `/usage`

### Chat (Firebase + Workspace)
- `/chat/*` — threads, messages, uploads

### Workspace
- `/workspace/*` — team, billing, docs

### AI Features
- 5-mode: `/ai/basic`, `/ai/pro`, `/ai/spine`, `/ai/assistant`, `/ai/dev`
- Multi-engine: `/research`, `/doc`, `/security`, `/identity`, `/agent`, `/task`, `/video`, `/audio`, `/voice`

### 기타
- `/billing`, `/business`, `/engine`, `/instance`, `/terminal`, `/fs`
- `/quantum`, `/quantum-v2`
- HPE: `/hpe`, `/hpe4`, `/hpe5`, `/hpe7`

## SSE 스트리밍 (`/api/stream`)
```
GET /api/stream?threadId=<id>
Content-Type: text/event-stream; charset=utf-8
X-Accel-Buffering: no
```
- Keep-alive ping: 15초
- StreamEngine 이벤트 → SSE `data: {...}\n\n`

### StreamEvent 종류
`stage` | `token` | `final` | `suggestion` | `done` | `reasoning_block` | `reasoning_done` | `answer_unlocked` | `activity`

### StreamStage
`thinking` | `analyzing_input` | `answer` | `answer_unlocked` | `studio_ready` | `spine:*`

## AI Providers
- `src/service/providers/claude-provider.ts`
- `src/service/providers/gpt-provider.ts`
- `src/service/providers/gemini-provider.ts`
- `src/service/providers/provider-selector.ts` — 모델명 기반 라우팅

## Billing/Plans
```typescript
type PlanId = "free" | "premium" | "developer" | "developer_pro"
  | "business" | "business_premium"
  | "enterprise" | "enterprise_team" | "enterprise_developer";
```

## 핵심 파일 경로
| 파일 | 역할 |
|------|------|
| `src/server/server.ts` | Express 앱 셋업 |
| `src/server/api-gateway.ts` | `/api/yua` 통합 진입점 |
| `src/routes/index.ts` | 라우터 레지스트리 (248줄) |
| `src/auth/auth.server.ts` | 인증 SSOT |
| `src/auth/auth.express.ts` | Express 미들웨어 어댑터 |
| `src/middleware/with-workspace.ts` | 워크스페이스 컨텍스트 |
| `src/routes/chat-user.router.ts` | Chat CRUD |
| `src/routes/workspace-router.ts` | Workspace API (50KB) |
| `src/routes/stream-router.ts` | SSE 스트리밍 |
| `src/routes/billing-router.ts` | 빌링/구독 |
| `src/ai/engines/thread.engine.ts` | 스레드 로직 |
| `src/ai/engines/message-engine.ts` | 메시지 로직 |
| `src/ai/workspace/workspace-context.ts` | 워크스페이스 컨텍스트 |
| `src/types/stream.ts` | 스트림 이벤트 타입 |
| `src/types/express.d.ts` | Express 타입 확장 |
| `src/db/firebase.ts` | Firebase Admin 초기화 |
| `src/db/postgres.ts` | PostgreSQL pool + pgvector |
| `src/db/mysql.ts` | MySQL pool |
| `src/db/redis.ts` | Redis client |

## 작업 가이드
- endpoint 변경 시: request/response shape을 `yua-shared` 계약과 맞춘다
- 프론트 breaking 여부 반드시 체크
- auth 관련: 토큰/헤더/워크스페이스 컨텍스트(`x-workspace-id`) 흐름 보존
- Prisma 스키마 변경 시: `npx prisma generate` 필요
- SSE 변경 시: `X-Accel-Buffering: no` + ETag 비활성화 유지
- Worker: `src/workers/` 디렉토리 (activity title 생성 등)
