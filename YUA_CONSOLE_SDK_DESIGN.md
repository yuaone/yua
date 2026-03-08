# YUA Console Redesign + Backend SDK Design Document

**Date:** 2026-03-07
**Author:** Claude Code
**Status:** Draft / Proposal

---

## Part 1 — yua-console 현재 분석

### 1.1 기술 스택

| 항목 | 현재 |
|------|------|
| Framework | Next.js 15.5.7 (App Router) + React 18.3.1 |
| Styling | Tailwind 3.4.14 + Framer Motion |
| State | Zustand 4.5.2 |
| 에디터 | Monaco Editor |
| 터미널 | xterm 5 + node-pty |
| 시각화 | D3 + d3-sankey |
| 서버 연결 | SSH2, dockerode |
| DB 직접 접근 | MySQL2, Postgres (Next.js 앱에서 직접) |
| 인증 | JWT (자체) + Firebase + bcryptjs |
| 마크다운 | react-markdown + KaTeX + highlight.js |
| API 통신 | 자체 apiGet/apiPost 함수, SWR |

### 1.2 현재 라우트 구조 (15개)

```
/               → 랜딩/히어로 (마케팅)
/login          → 로그인
/signup         → 회원가입
/overview       → 대시보드 (정적 소개 페이지)
/console        → 터미널 콘솔
/chat           → 채팅 플레이그라운드
/instance/*     → 인스턴스 관리 (목록/상세/생성/터미널/로그)
/keys           → API 키 관리
/billing/*      → 빌링 (결제/업그레이드/성공/실패/이력)
/usage          → 사용량 메트릭
/models         → 모델 선택/정보
/projects       → 프로젝트 관리
/quickstart     → 시작 가이드
/docs/*         → 문서 포탈 (SPINE, SDK, Chat API, Instances)
```

### 1.3 문제점 분석

#### A. 아키텍처 문제
1. **DB 직접 접근** — Next.js 앱에서 MySQL2/Postgres를 직접 import. 보안 위험 + backend와 로직 중복.
2. **인증 이중 체계** — JWT (자체 발급) + Firebase 동시 사용. yua-web은 Firebase only. 통일 필요.
3. **모노레포 격리 실패** — yua-shared 타입을 사용하지 않고 `src/types/`에 자체 타입 정의 (message.ts, user.ts, billing.ts 등).
4. **패키지 매니저 불일치** — package.json에 `pnpm` 설정 없음. 별도 node_modules (모노레포 workspace 미활용 가능성).

#### B. UI/UX 문제
1. **Overview 페이지** — 정적 마케팅 텍스트. 실제 대시보드 데이터(활성 사용자, API 호출 수, 에러율 등) 없음.
2. **Usage 페이지** — 단순 텍스트 리스트. 차트/그래프 없음. 필터링, 기간 선택 불가.
3. **Keys 페이지** — `alert()` 기반 알림. 모달/토스트 없음. 키 권한/스코프 설정 불가.
4. **다크 모드 없음** — yua-web은 html.dark 기반 다크 모드 지원. 콘솔은 화이트 단일.
5. **반응형 미지원** — `ml-[240px]` 고정 마진. 모바일/태블릿 대응 없음.
6. **실시간 모니터링 없음** — SSE 활용 전무. 인스턴스 상태, 스트림 세션 등 수동 새로고침.

#### C. 기능 부재
1. 사용자/워크스페이스 관리 UI 없음 (backend에 API 있으나 콘솔에서 미사용)
2. 프롬프트/시스템 설정 관리 없음
3. 에러 트래킹/로그 뷰어 기본 수준
4. AI 모델 비용/성능 비교 대시보드 없음
5. 팀 멤버 관리 UI 없음

---

## Part 2 — yua-console Redesign

> **DEPRECATED (2026-03-08)** — Part 2의 라우트/컴포넌트 설계는
> `YUA_PLATFORM_ADMIN_DESIGN.md`에서 yua-console → yua-platform(외부) + yua-admin(내부) 분리가
> 확정되면서 무효화되었습니다. platform/admin 별도 설계는 PLATFORM_ADMIN 문서를 참조하세요.
> Part 1(현재 분석), Part 3(SDK), Part 4(로드맵)는 유효합니다.

### 2.1 설계 원칙

1. **Backend API 전용** — DB 직접 접근 제거. 모든 데이터는 yua-backend API를 통해서만.
2. **yua-shared SSOT** — 자체 타입 정의 전면 제거. yua-shared에서 import.
3. **Firebase Auth 통일** — JWT 자체 발급 제거. yua-web과 동일한 Firebase Auth + `requireFirebaseAuth` 체계.
4. **yua-web 디자인 언어 통일** — CSS 변수 체계 (`var(--surface-panel)`, `var(--text-primary)` 등), 다크 모드 지원.
5. **실시간 우선** — SSE 기반 실시간 모니터링.

### 2.2 기술 스택 (Target)

| 항목 | Target | 이유 |
|------|--------|------|
| Framework | Next.js 14 (App Router) | yua-web과 버전 통일 (확정) |
| React | 18.3.x | yua-web과 통일 (확정) |
| Styling | Tailwind + CSS Variables | yua-web 디자인 토큰 공유 |
| State | Zustand 5.x | yua-web과 통일 |
| 차트 | recharts 또는 @tremor/react | 대시보드 특화 |
| 테이블 | @tanstack/react-table v8 | 대용량 데이터 테이블 |
| 에디터 | Monaco Editor (유지) | 코드/프롬프트 편집 |
| 터미널 | @xterm/xterm 5.x (유지) | SSH/셸 |
| API 통신 | yua-sdk (아래 Part 3) | 타입 안전 API 호출 |
| 인증 | Firebase Auth (yua-web 동일) | 통일 |
| 시각화 | D3 (유지, 필요 시) | 고급 시각화 |

### 2.3 페이지 구조 (Redesign)

```
/                          → 리디렉트 → /dashboard
/login                     → Firebase Auth 로그인
/dashboard                 → 실시간 대시보드 (KPI, 차트, 알림)

/users                     → 사용자 목록 + 검색/필터
/users/[id]                → 사용자 상세 (활동, 사용량, 워크스페이스)

/workspaces                → 워크스페이스 목록
/workspaces/[id]           → 워크스페이스 상세 (멤버, 플랜, 설정)
/workspaces/[id]/members   → 멤버 관리 (초대/역할 변경/제거)

/threads                   → 전체 스레드 목록 (검색, 필터, 정렬)
/threads/[id]              → 스레드 상세 (메시지 열람, 메타데이터)

/models                    → AI 모델 관리 (활성/비활성, 비용, 성능 지표)
/models/prompts            → 시스템 프롬프트 관리 (버전, A/B 테스트)

/api-keys                  → API 키 관리 (스코프, 만료, 사용 이력)
/api-keys/playground       → API 테스트 플레이그라운드

/billing                   → 빌링 대시보드 (수익, 플랜 분포, 결제 이력)
/billing/plans             → 플랜 관리 (가격, 한도 설정)

/monitoring                → 실시간 모니터링 (SSE 기반)
/monitoring/streams        → 활성 스트림 세션 목록
/monitoring/errors         → 에러 트래킹 (실시간)
/monitoring/performance    → 응답 시간, TTFB, 토큰/초

/logs                      → 시스템 로그 뷰어 (필터, 검색, 실시간 tail)

/instances                 → 인스턴스 관리 (유지)
/instances/[id]            → 인스턴스 상세
/instances/[id]/terminal   → 터미널

/settings                  → 시스템 설정
/settings/security         → 보안 설정 (rate limit, 공격 모니터)
/settings/providers        → AI Provider 설정 (API 키, 모델 매핑)
```

### 2.4 컴포넌트 트리

```
app/
  layout.tsx                    ← RootLayout (html.dark 지원)
  providers.tsx                 ← AuthProvider + QueryProvider + ThemeProvider

  (auth)/
    login/page.tsx

  (console)/                    ← 인증 필수 Layout Group
    layout.tsx                  ← ConsoleLayout (Sidebar + Header + Content)

    dashboard/page.tsx
    users/page.tsx
    users/[id]/page.tsx
    workspaces/page.tsx
    ...

components/
  layout/
    ConsoleSidebar.tsx          ← 좌측 네비게이션 (collapsible)
    ConsoleHeader.tsx           ← 상단 바 (검색, 프로필, 알림)
    Breadcrumb.tsx

  dashboard/
    KPICard.tsx                 ← 주요 지표 카드
    UsageChart.tsx              ← 일간/월간 사용량 차트
    ActiveStreamsWidget.tsx      ← 실시간 활성 스트림 수
    ErrorRateWidget.tsx         ← 에러율 차트
    RecentActivityFeed.tsx      ← 최근 활동 피드

  data-table/
    DataTable.tsx               ← @tanstack/react-table 래퍼
    ColumnFilter.tsx
    Pagination.tsx
    SearchBar.tsx

  monitoring/
    LiveStreamList.tsx          ← SSE 기반 실시간 스트림 목록
    ErrorTimeline.tsx           ← 에러 타임라인
    PerformanceGauge.tsx        ← 응답 시간 게이지
    MetricCard.tsx

  users/
    UserTable.tsx
    UserDetail.tsx
    UserActivityLog.tsx

  workspaces/
    WorkspaceTable.tsx
    WorkspaceDetail.tsx
    MemberManager.tsx
    PlanBadge.tsx

  threads/
    ThreadTable.tsx
    ThreadViewer.tsx             ← 메시지 뷰어 (읽기 전용)
    ThreadMetadata.tsx

  models/
    ModelGrid.tsx
    ModelConfigEditor.tsx        ← Monaco 기반 프롬프트 편집
    PromptVersionHistory.tsx

  billing/
    RevenueChart.tsx
    PlanDistribution.tsx
    PaymentHistory.tsx

  logs/
    LogViewer.tsx                ← 실시간 로그 (tail -f 스타일)
    LogFilter.tsx
    LogDetail.tsx

  ui/                           ← 공통 UI (yua-web 디자인 토큰 공유)
    Button.tsx
    Badge.tsx
    Modal.tsx
    Toast.tsx
    Tooltip.tsx
    Dropdown.tsx
    Tabs.tsx
    Card.tsx
    Input.tsx
    Select.tsx
    Switch.tsx
    Skeleton.tsx

stores/
  useConsoleAuthStore.ts        ← Firebase auth 상태
  useDashboardStore.ts          ← 대시보드 KPI 캐시
  useMonitoringStore.ts         ← 실시간 모니터링 SSE 구독
  useThemeStore.ts              ← 다크/라이트 모드
```

### 2.5 실시간 모니터링 설계 (SSE)

Backend에 새로운 admin SSE 엔드포인트 추가:

```
GET /api/admin/monitor/stream
  → 이벤트: active_streams, error_alert, usage_spike, system_health
  → 15초 keep-alive ping
  → superadmin role 필수
```

프론트에서 `useMonitoringStore`가 SSE를 구독하고, 위젯들이 스토어를 참조.

### 2.6 디자인 토큰 통일

yua-web의 CSS 변수 체계를 그대로 가져와서 콘솔 전용 확장:

```css
/* 공통 (yua-web과 동일) */
--surface-panel, --line, --wash
--text-primary, --text-secondary, --text-muted

/* 콘솔 전용 확장 */
--console-sidebar-bg
--console-header-bg
--console-status-ok: #10b981
--console-status-warn: #f59e0b
--console-status-error: #ef4444
--console-chart-primary: #6366f1
--console-chart-secondary: #8b5cf6
```

---

## Part 3 — yua-backend SDK Design

### 3.1 Backend API 분석 요약

yua-backend는 Express 4.18 + TypeScript 서버로, 80개 이상의 라우터 파일을 갖고 있다.

#### 핵심 API 그룹

| 그룹 | 경로 | 인증 | 설명 |
|------|------|------|------|
| Auth | `/auth/login`, `/auth/me` | Public/Bearer | Firebase token -> JWT 변환 |
| Me | `/me/*` | Firebase | 현재 사용자 정보 |
| Chat | `/chat/thread`, `/chat/threads`, `/chat/messages/*` | Firebase + Workspace | 스레드/메시지 CRUD |
| Stream | `/chat/stream?threadId=` | Firebase/APIKey | SSE 스트리밍 |
| Stream Control | `/chat/stream/abort` | Firebase | 스트림 중단 |
| Workspace | `/workspace/*` | Firebase + Workspace | 워크스페이스 CRUD, 팀, 문서 |
| Project | `/project/*` | Firebase | 프로젝트 CRUD |
| Memory | `/memory/*` | Firebase + Workspace | 메모리 시스템 |
| Billing | `/billing/*` | Firebase + Workspace | 빌링, 구독, 결제 |
| Usage | `/usage/*` | Firebase | 사용량 조회 |
| API Key | `/key/*` | Firebase | API 키 CRUD |
| Upload | `/chat/upload`, `/assets/*` | Firebase | 파일 업로드 |
| Voice | `/voice/*` | Firebase | 음성 처리 |
| Share | `/share/:token` (GET), `/chat/share` (POST) | Mixed | 공유 링크 |
| Instance | `/instance/*` | Firebase + RateLimit | 인스턴스 관리 |
| Admin | `/superadmin/*`, `/dev/*` | Firebase + RateLimit | 관리자 전용 |
| AI Modes | `/ai/basic,pro,spine,assistant,dev` | UsageLimit | AI 엔진 호출 |
| Health | `/health` | Public | 서버 상태 |

#### 인증 체계
```
Authorization: Bearer <firebase-id-token>
  -> requireFirebaseAuth (middleware)
  -> firebaseAuth.verifyIdToken()
  -> MySQL users 테이블 조회 (firebase_uid)
  -> req.user = { userId, firebaseUid, email, name, role }

x-workspace-id: <uuid>
  -> withWorkspace (middleware)
  -> workspace role 조회
  -> req.workspace = { id, role }
```

### 3.2 SDK 구조 (OpenAI SDK 미러)

```
@yua/sdk/                           (npm: @yua/sdk)
  src/
    index.ts                        ← default export: YUA 클래스
    yua.ts                          ← YUA 클래스 (OpenAI 클래스 미러)

    resources/
      chat/
        completions.ts              ← Completions (create, stream)
        threads.ts                  ← Threads CRUD
        messages.ts                 ← Messages CRUD
        index.ts                    ← ChatResource (completions + threads + messages)

    core/
      api-client.ts                 ← HTTP fetch 래퍼 (retry, timeout, auth header)
      streaming.ts                  ← Stream<T> — AsyncIterable + .on() + .textContent()
      auth.ts                       ← API Key / Firebase auth provider
      error.ts                      ← APIError, AuthenticationError, RateLimitError

    types/
      chat.ts                       ← ChatCompletion, ChatCompletionChunk (SDK 정의)
      stream.ts                     ← Stream 관련 타입
      shared.ts                     ← yua-shared re-export

    _shims/
      web.ts                        ← fetch/ReadableStream polyfill (브라우저)
      node.ts                       ← node:http 기반 SSE (Node.js)
```

Python SDK (Phase 2):
```
yua-python/                         (pip: yua)
  src/yua/
    __init__.py                     ← YUA 클래스
    resources/chat/completions.py
    _streaming.py                   ← Stream[T] (httpx SSE)
    _client.py                      ← SyncAPIClient, AsyncAPIClient
    types/chat.py                   ← Pydantic 모델
```

### 3.3 OpenAI SDK 호환 설계 방침

> **핵심 원칙**: OpenAI SDK (`openai` npm)의 API surface를 최대한 미러링.
> 기존 OpenAI 유저가 `import` 한 줄만 바꾸면 YUA로 전환 가능하게.
>
> **YUA 확장**: activity (사고 과정), memory, suggestion, reasoning_block 등
> OpenAI에 없는 이벤트는 `.on()` 확장 핸들러 + `stream.events` iterable로 제공.

### 3.4 응답 타입 체계 (SSOT)

> 소스: `yua-shared/src/stream/types.ts`, `yua-shared/src/chat/chat-types.ts`,
> `yua-backend/src/types/stream.ts`, `yua-shared/src/stream/activity.ts`

#### 3.4.1 Chat Completion (비스트리밍)

```typescript
// OpenAI 호환 구조
interface ChatCompletion {
  id: string;                          // trace_id
  object: "chat.completion";
  created: number;                     // Unix timestamp
  model: string;                       // "yua-normal" | "yua-fast" | "yua-deep"

  choices: [{
    index: 0;
    message: {
      role: "assistant";
      content: string;                 // 전체 응답 텍스트
    };
    finish_reason: "stop" | "length" | "content_filter";
  }];

  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };

  // --- YUA 확장 (OpenAI에 없는 필드) ---
  yua?: {
    thinking_profile: "FAST" | "NORMAL" | "DEEP";
    activities: ActivityItem[];        // 사고 과정 타임라인
    suggestions: SuggestionItem[];     // 후속 질문 제안
    memory_ops: MemoryStreamPayload[]; // 메모리 변경 이력
    reasoning_blocks: ReasoningBlock[];// 딥 씽킹 블록
  };
}
```

#### 3.4.2 Chat Completion Chunk (스트리밍)

```typescript
// OpenAI 호환 구조 — for await (const chunk of stream)
interface ChatCompletionChunk {
  id: string;                          // trace_id (모든 chunk 동일)
  object: "chat.completion.chunk";
  created: number;

  choices: [{
    index: 0;
    delta: {
      role?: "assistant";              // 첫 chunk에만
      content?: string;                // 토큰 delta
    };
    finish_reason: null | "stop" | "length";
  }];

  // --- YUA 확장 이벤트 (delta 외 이벤트 발생 시) ---
  yua_event?: {
    type: YuaEventType;
    data: YuaEventData;
  };
}

type YuaEventType =
  | "stage"              // 스테이지 전환 (thinking → answer)
  | "activity"           // 사고 과정 (ADD/PATCH/END)
  | "reasoning_block"    // 딥 씽킹 블록
  | "reasoning_done"     // 딥 씽킹 종료
  | "suggestion"         // 후속 질문 제안
  | "memory"             // 메모리 커밋
  | "answer_unlocked";   // 씽킹 완료, 답변 표시 가능

type YuaEventData =
  | { stage: StreamStage }
  | { activity: ActivityEventPayload }
  | { block: ReasoningBlock }
  | { suggestions: SuggestionItem[] }
  | { memory: MemoryStreamPayload };
```

#### 3.4.3 핵심 하위 타입 (yua-shared SSOT)

```typescript
// StreamStage — 스트림 단계
type StreamStage =
  | "thinking"           // 모델 추론 중
  | "answer"             // 답변 생성 중
  | "answer_unlocked"    // 씽킹 완료 → 답변 표시
  | "analyzing_image"    // 이미지 분석
  | "system"             // 시스템 메시지
  | `spine:${string}`;   // 확장 네임스페이스

// ActivityItem — 사고 과정 1개 단위
interface ActivityItem {
  id: string;
  kind: ActivityKind;
  status?: "RUNNING" | "OK" | "FAILED";
  title?: string;
  body?: string;
  inlineSummary?: string;
  sections?: ActivitySection[];
  chips?: SourceChip[];              // 참조 출처
  at?: number;
  artifact?: {                       // 첨부 결과물
    kind: "IMAGE_PANEL" | "CSV_PREVIEW" | "CODE_OUTPUT" | "CODE_ERROR";
    imageUrl?: string;
    csvPreview?: { headers: string[]; rows: string[][]; totalRows: number };
    code?: { language: string; source: string; output: string };
  };
  meta?: Record<string, unknown>;
}

// ActivityKind — 16종
type ActivityKind =
  | "NOTE" | "TOOL" | "SEARCHING" | "RESEARCHING"
  | "RANKING_RESULTS" | "ANALYZING_INPUT" | "ANALYZING_IMAGE"
  | "PLANNING" | "REASONING_SUMMARY" | "EXECUTING"
  | "VERIFYING" | "FINALIZING" | "IMAGE_ANALYSIS"
  | "IMAGE_GENERATION" | "CODE_INTERPRETING" | "QUANT_ANALYSIS";

// ActivityOp — ADD → PATCH* → END
type ActivityOp = "ADD" | "PATCH" | "END";

// SuggestionItem — 후속 질문
interface SuggestionItem {
  id: string;
  label: string;
  intent: "CONTINUE" | "COMPARE" | "STRUCTURE" | "APPLY" | "SUMMARIZE";
  emoji?: string;
}

// ReasoningBlock — 딥 씽킹 패널
interface ReasoningBlock {
  id: string;
  title: string;
  body: string;
  inlineSummary?: string;
  groupIndex?: number;
}

// MemoryStreamPayload — 메모리 변경
interface MemoryStreamPayload {
  op: "PENDING" | "SAVED" | "UPDATED" | "CONFLICT" | "SKIPPED";
  memoryId?: number;
  scope: "user_profile" | "user_preference" | "user_research"
       | "project_architecture" | "project_decision" | "general_knowledge";
  content: string;
  confidence?: number;
  reason?: string;
}
```

### 3.5 SDK 클라이언트 설계 (OpenAI 스타일)

```typescript
import YUA from "@yua/sdk";

// --- 초기화 (OpenAI 패턴 동일) ---
const yua = new YUA({
  apiKey: "yua_live_a1b2c3...",         // API Key 인증
  baseURL: "https://api.yuaone.com/v1", // 기본값
  timeout: 30_000,                      // ms
  maxRetries: 2,
});

// Firebase 인증 (웹/모바일 클라이언트용)
const yua = new YUA({
  authProvider: () => getAuth().currentUser!.getIdToken(),
  workspace: "ws_abc123",
});
```

#### 3.5.1 `yua.chat.completions.create()` — 비스트리밍

```typescript
// OpenAI와 동일한 호출 패턴
const completion = await yua.chat.completions.create({
  model: "yua-normal",                  // FAST | NORMAL | DEEP
  messages: [
    { role: "user", content: "한국 GDP 성장률 분석해줘" }
  ],
  // YUA 확장 옵션
  yua_options: {
    thread_id: 12345,                   // 기존 스레드에 연결 (없으면 자동 생성)
    attachments: [{ file_id: "att_xxx" }],
    deep_variant: "EXPANDED",           // DEEP 모드 전용
  },
});

console.log(completion.choices[0].message.content);
console.log(completion.usage);
// YUA 확장
console.log(completion.yua?.activities);     // 사고 과정
console.log(completion.yua?.suggestions);    // 후속 질문
```

#### 3.5.2 `yua.chat.completions.create({ stream: true })` — 스트리밍

```typescript
// --- 기본 스트리밍 (OpenAI for-await 패턴) ---
const stream = await yua.chat.completions.create({
  model: "yua-normal",
  messages: [{ role: "user", content: "안녕하세요" }],
  stream: true,
});

for await (const chunk of stream) {
  // OpenAI 호환: 토큰 delta
  const delta = chunk.choices[0]?.delta?.content;
  if (delta) process.stdout.write(delta);

  // YUA 확장: activity, reasoning 등
  if (chunk.yua_event) {
    switch (chunk.yua_event.type) {
      case "stage":
        console.log(`[${chunk.yua_event.data.stage}]`);
        break;
      case "activity":
        const { op, item } = chunk.yua_event.data.activity;
        if (op === "ADD") console.log(`  > ${item.title}`);
        break;
      case "suggestion":
        console.log("Suggestions:", chunk.yua_event.data.suggestions);
        break;
    }
  }
}
```

#### 3.5.3 편의 메서드 (YUA 확장)

```typescript
// --- .textContent() — 전체 텍스트만 수집 ---
const stream = await yua.chat.completions.create({
  model: "yua-normal",
  messages: [{ role: "user", content: "요약해줘" }],
  stream: true,
});

const text = await stream.textContent();
// "요약 결과..."

// --- .on() 이벤트 핸들러 (Node EventEmitter 패턴) ---
const stream = await yua.chat.completions.create({
  model: "yua-deep",
  messages: [{ role: "user", content: "심층 분석" }],
  stream: true,
});

stream.on("stage", (stage) => updateUI(stage));
stream.on("activity", ({ op, item }) => renderTimeline(op, item));
stream.on("reasoning_block", (block) => renderThinking(block));
stream.on("suggestion", (items) => showSuggestions(items));
stream.on("memory", (payload) => showMemoryIndicator(payload));

for await (const chunk of stream) {
  appendToken(chunk.choices[0]?.delta?.content ?? "");
}

// --- .abort() — 스트림 중단 ---
stream.abort();

// --- .finalMessage() — 스트림 완료 후 ChatCompletion 반환 ---
const final = await stream.finalMessage();
console.log(final.usage);
console.log(final.yua?.activities);
```

### 3.6 Thread / Message API (CRUD)

```typescript
// --- Threads ---
const thread = await yua.chat.threads.create({ title: "분석 프로젝트" });
// { id: 12345, title: "분석 프로젝트", created_at: 1709856000 }

const threads = await yua.chat.threads.list({ limit: 20 });
// { data: Thread[], has_more: boolean }

await yua.chat.threads.update(12345, { title: "새 제목" });
await yua.chat.threads.del(12345);

// --- Messages ---
const messages = await yua.chat.messages.list(12345, { limit: 50 });
// { data: ChatMessage[] }

await yua.chat.messages.create(12345, {
  role: "user",
  content: "추가 질문",
  attachments: [{ file_id: "att_xxx" }],
});
```

### 3.7 에러 핸들링

```typescript
import YUA, { APIError, AuthenticationError, RateLimitError } from "@yua/sdk";

try {
  await yua.chat.completions.create({ ... });
} catch (e) {
  if (e instanceof AuthenticationError) {
    // 401/403 — 토큰 만료 또는 키 무효
    // SDK 내부: Firebase 토큰 자동 갱신 후 1회 재시도 이미 실패한 상태
    router.push("/login");
  }
  if (e instanceof RateLimitError) {
    // 429 — Retry-After 헤더 자동 존중 (SDK 내부)
    console.log(`Retry after ${e.retryAfter}s`);
  }
  if (e instanceof APIError) {
    console.log(e.status);       // HTTP status
    console.log(e.code);         // "usage_limit_exceeded" | "compute_gate_busy" | ...
    console.log(e.message);      // 사람이 읽을 수 있는 메시지
    console.log(e.requestId);    // trace_id (디버깅용)
  }
}
```

에러 코드 체계:

| HTTP | code | 설명 |
|------|------|------|
| 401 | `invalid_api_key` | API Key 무효/만료 |
| 401 | `token_expired` | Firebase 토큰 만료 |
| 403 | `workspace_access_denied` | 워크스페이스 권한 없음 |
| 429 | `rate_limit_exceeded` | RPM/TPM 초과 |
| 429 | `compute_gate_busy` | 동시 요청 제한 (Free: 1, Pro: 3) |
| 402 | `insufficient_credits` | API 크레딧 부족 |
| 402 | `usage_limit_exceeded` | 일일/월간 사용량 초과 |
| 500 | `internal_error` | 서버 내부 오류 |
| 503 | `model_overloaded` | 모델 과부하 |

### 3.8 타입 시스템

SDK 타입은 `yua-shared` re-export + SDK 전용 래퍼:

```typescript
// @yua/sdk — 메인 export
export default class YUA { ... }

// 에러 클래스
export { APIError, AuthenticationError, RateLimitError, BadRequestError } from "./error";

// 응답 타입 (SDK 정의, yua-shared 기반)
export type { ChatCompletion, ChatCompletionChunk } from "./types/chat";
export type { Stream } from "./types/stream";

// yua-shared re-export (하위 타입)
export type {
  ChatMessage, ChatThread, AttachmentMeta,
  StreamStage, SuggestionItem, ThinkingProfile,
  ActivityItem, ActivityKind, ActivityOp,
  MemoryStreamPayload, MemoryStreamOp, MemoryScope,
} from "yua-shared";
```

### 3.9 사용 예시 (실전)

#### Python SDK (Phase 2)

```python
import yua

client = yua.YUA(api_key="yua_live_a1b2c3...")

# 비스트리밍
response = client.chat.completions.create(
    model="yua-normal",
    messages=[{"role": "user", "content": "한국 GDP 분석"}],
)
print(response.choices[0].message.content)

# 스트리밍
stream = client.chat.completions.create(
    model="yua-deep",
    messages=[{"role": "user", "content": "심층 분석"}],
    stream=True,
)
for chunk in stream:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="")
    if chunk.yua_event and chunk.yua_event.type == "activity":
        print(f"\n  > {chunk.yua_event.data.activity.item.title}")
```

#### REST (curl)

```bash
# 비스트리밍
curl https://api.yuaone.com/v1/chat/completions \
  -H "Authorization: Bearer yua_live_a1b2c3..." \
  -H "Content-Type: application/json" \
  -d '{
    "model": "yua-normal",
    "messages": [{"role": "user", "content": "안녕"}]
  }'

# 스트리밍
curl https://api.yuaone.com/v1/chat/completions \
  -H "Authorization: Bearer yua_live_a1b2c3..." \
  -H "Content-Type: application/json" \
  -d '{
    "model": "yua-normal",
    "messages": [{"role": "user", "content": "안녕"}],
    "stream": true
  }' --no-buffer

# SSE 응답 (text/event-stream):
# data: {"id":"tr_abc","object":"chat.completion.chunk","choices":[{"delta":{"content":"안녕"},...}]}
# data: {"id":"tr_abc","object":"chat.completion.chunk","yua_event":{"type":"suggestion",...}}
# data: [DONE]
```

#### 모델 매핑

| SDK model | 백엔드 ThinkingProfile | 용도 |
|-----------|----------------------|------|
| `yua-fast` | FAST | 단순 응답, 번역, 요약 |
| `yua-normal` | NORMAL | 범용 (기본값) |
| `yua-deep` | DEEP (STANDARD) | 심층 분석, 추론 |
| `yua-deep-expanded` | DEEP (EXPANDED) | 확장 심층 (다단계 검증) |
| `yua-search` | NORMAL + SEARCH mode | 웹검색 특화 |

---

## Part 3.5 — 백엔드 감사 결과 (2026.03.08)

> 상세 내용은 `YUA_PLATFORM_ADMIN_DESIGN.md` 섹션 7.4~7.7 참조

### 현재 백엔드 API Key 시스템 문제점

1. **저장소 3중복** — keys.json (평문!) + MySQL api_keys_v2 + Firestore api_keys → MySQL SSOT로 통일 필요
2. **선불 크레딧 없음** — 실행 전 잔고 체크 없어 무한 호출 가능 → credit-check 미들웨어 추가
3. **키별 Rate Limit 없음** — IP 기반 글로벌만 → 키별 RPM/TPM 테이블 필요
4. **Scope/권한 없음** — 모든 키 = user role → read/write/admin 스코프 추가
5. **워크스페이스 격리 없음** — user_id만 연결 → workspace_id 바인딩 필요

### SDK 과금 연계

- OpenAI Runtime → `response.completed` → `billing-finalize.ts` → `yua_usage_daily.cost_unit`
- SDK API Key 유저도 **동일 파이프라인** 사용, 별도 과금 엔진 불필요
- 추가 필요: `api_key_credits` (선불 잔고) + `credit_transactions` (충전/차감 이력) + `api_key_audit_log` (요청별 감사)

---

## Part 4 — 구현 로드맵

### P0 — Foundation (2-3 weeks)

| # | 작업 | 패키지 | 설명 |
|---|------|--------|------|
| 1 | yua-shared 타입 보강 | yua-shared | Console/SDK에 필요한 Admin 타입 추가 (AdminUser, SystemStats, ErrorLog 등) |
| 2 | SDK 코어 | yua-sdk (new) | YuaClient, transport (http/sse), auth (firebase/apiKey), error handling |
| 3 | SDK Chat + Stream | yua-sdk | ChatModule, StreamModule, StreamSubscription |
| 4 | Console 스캐폴딩 | yua-console | Next.js 14 재초기화, 디자인 토큰, Firebase Auth, ConsoleLayout |
| 5 | Console 로그인 | yua-console | Firebase Auth 로그인 (yua-web과 동일한 flow) |
| 6 | Backend Admin API | yua-backend | `/admin/users`, `/admin/stats`, `/admin/workspaces` 엔드포인트 |
| 7 | Console Dashboard | yua-console | KPI 카드, 사용량 차트 (SDK 경유) |

### P1 — Core Admin Features (3-4 weeks)

| # | 작업 | 패키지 | 설명 |
|---|------|--------|------|
| 8 | SDK Workspace + Project | yua-sdk | WorkspaceModule, ProjectModule |
| 9 | SDK Admin | yua-sdk | AdminModule (listUsers, stats, errors) |
| 10 | Console 사용자 관리 | yua-console | UserTable, UserDetail, 검색/필터 |
| 11 | Console 워크스페이스 관리 | yua-console | WorkspaceTable, 멤버 관리, 플랜 표시 |
| 12 | Console 스레드 뷰어 | yua-console | ThreadTable, ThreadViewer (메시지 읽기 전용) |
| 13 | Console 빌링 대시보드 | yua-console | 수익 차트, 플랜 분포, 결제 이력 |
| 14 | Console API 키 관리 | yua-console | 키 CRUD + 스코프 설정 + 사용 이력 |
| 15 | Console 다크 모드 | yua-console | html.dark + CSS 변수 전체 적용 |

### P2 — Advanced Features (4-5 weeks)

| # | 작업 | 패키지 | 설명 |
|---|------|--------|------|
| 16 | Backend Monitor SSE | yua-backend | `/admin/monitor/stream` 실시간 스트림 |
| 17 | Console 실시간 모니터링 | yua-console | LiveStreamList, ErrorTimeline, PerformanceGauge |
| 18 | Console 로그 뷰어 | yua-console | 실시간 tail, 필터, 검색 |
| 19 | Console 모델/프롬프트 관리 | yua-console | Monaco 기반 프롬프트 편집, 버전 관리 |
| 20 | SDK Memory + Upload + Voice | yua-sdk | 나머지 모듈 구현 |
| 21 | Console 인스턴스 관리 | yua-console | 기존 기능 SDK 경유로 마이그레이션 |
| 22 | SDK 문서 | yua-sdk | API Reference + 가이드 (TSDoc 기반 자동 생성) |
| 23 | Console API Playground | yua-console | API 테스트 UI (curl 생성, 응답 뷰어) |
| 24 | Console 반응형 | yua-console | 태블릿 대응 (모바일은 비우선) |

### 의존성 관계

```
P0-1 (yua-shared 타입)
  -> P0-2 (SDK 코어)
    -> P0-3 (SDK Chat+Stream)
    -> P1-8 (SDK Workspace)
    -> P1-9 (SDK Admin)
    -> P2-20 (SDK 나머지)

P0-4 (Console 스캐폴딩)
  -> P0-5 (Console 로그인)
    -> P0-7 (Dashboard)
      -> P1-10~14 (Core Admin)
        -> P2-17~23 (Advanced)

P0-6 (Backend Admin API)
  -> P1-9 (SDK Admin)
  -> P2-16 (Monitor SSE)
```

---

## 부록 A — yua-console에서 제거할 의존성

| 패키지 | 이유 |
|--------|------|
| `mysql2` | DB 직접 접근 제거 → SDK 경유 |
| `postgres` | 동일 |
| `ssh2` | 인스턴스 터미널은 backend proxy 경유 |
| `node-pty` | 서버 사이드 셸 → backend로 이동 |
| `dockerode` | 인스턴스 관리 → backend API |
| `bcryptjs` | 자체 JWT 인증 제거 |
| `jsonwebtoken` | 자체 JWT 인증 제거 |
| `formidable` | 파일 업로드 → SDK upload module |

## 부록 B — yua-shared에 추가 필요한 타입

```typescript
// admin/admin-types.ts
export interface AdminUser {
  userId: number;
  firebaseUid: string;
  email: string | null;
  name: string | null;
  role: "user" | "admin";
  authProvider: "google" | "email" | null;
  createdAt: string;
  lastLoginAt: string | null;
  isActive: boolean;
  workspaceCount: number;
  totalTokensUsed: number;
}

export interface SystemStats {
  totalUsers: number;
  activeUsersToday: number;
  activeUsersWeek: number;
  totalThreads: number;
  totalMessages: number;
  totalTokensToday: number;
  activeStreams: number;
  errorRatePercent: number;
  avgResponseMs: number;
  planDistribution: Record<PlanId, number>;
}

export interface ErrorLog {
  id: string;
  level: "error" | "warn";
  message: string;
  stack?: string;
  userId?: number;
  route?: string;
  timestamp: string;
  meta?: Record<string, unknown>;
}

export interface AdminWorkspace {
  id: string;
  name: string;
  ownerId: number;
  ownerEmail: string;
  planId: PlanId;
  memberCount: number;
  threadCount: number;
  createdAt: string;
  isActive: boolean;
}
```

## 부록 C — Backend에 필요한 새 엔드포인트

```
# Admin API (superadmin role 필수)
GET    /api/admin/users              ← 전체 사용자 목록 (query, limit, offset)
GET    /api/admin/users/:id          ← 사용자 상세
PATCH  /api/admin/users/:id/status   ← 사용자 활성/비활성
GET    /api/admin/workspaces         ← 전체 워크스페이스 목록
GET    /api/admin/workspaces/:id     ← 워크스페이스 상세
GET    /api/admin/stats              ← 시스템 통계 (KPI)
GET    /api/admin/errors             ← 에러 로그 (level, since, limit)
GET    /api/admin/monitor/stream     ← 실시간 모니터링 SSE
GET    /api/admin/threads            ← 전체 스레드 검색
GET    /api/admin/threads/:id        ← 스레드 상세 (메시지 포함)
GET    /api/admin/models             ← 모델 목록 + 설정
PATCH  /api/admin/models/:id         ← 모델 설정 변경
GET    /api/admin/prompts            ← 시스템 프롬프트 목록
PUT    /api/admin/prompts/:id        ← 프롬프트 수정
```
