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

### 2.1 설계 원칙

1. **Backend API 전용** — DB 직접 접근 제거. 모든 데이터는 yua-backend API를 통해서만.
2. **yua-shared SSOT** — 자체 타입 정의 전면 제거. yua-shared에서 import.
3. **Firebase Auth 통일** — JWT 자체 발급 제거. yua-web과 동일한 Firebase Auth + `requireFirebaseAuth` 체계.
4. **yua-web 디자인 언어 통일** — CSS 변수 체계 (`var(--surface-panel)`, `var(--text-primary)` 등), 다크 모드 지원.
5. **실시간 우선** — SSE 기반 실시간 모니터링.

### 2.2 기술 스택 (Target)

| 항목 | Target | 이유 |
|------|--------|------|
| Framework | Next.js 14 (App Router) | yua-web과 버전 통일 |
| React | 18.3.x | yua-web과 통일 |
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

### 3.2 SDK 구조

```
yua-sdk/
  src/
    index.ts                    ← 메인 export
    client.ts                   ← YuaClient 클래스

    auth/
      firebase-auth.ts          ← Firebase token 자동 갱신
      api-key-auth.ts           ← API Key 인증
      types.ts

    modules/
      chat.ts                   ← ChatModule (threads, messages, send)
      stream.ts                 ← StreamModule (SSE 구독)
      workspace.ts              ← WorkspaceModule
      project.ts                ← ProjectModule
      memory.ts                 ← MemoryModule
      billing.ts                ← BillingModule
      usage.ts                  ← UsageModule
      user.ts                   ← UserModule (me, settings)
      apiKey.ts                 ← ApiKeyModule
      upload.ts                 ← UploadModule
      voice.ts                  ← VoiceModule
      share.ts                  ← ShareModule
      admin.ts                  ← AdminModule (superadmin)
      instance.ts               ← InstanceModule

    transport/
      http.ts                   ← fetch/axios 래퍼 (retry, timeout)
      sse.ts                    ← SSE 클라이언트 (EventSource 래퍼)
      error.ts                  ← YuaApiError 클래스

    types/
      index.ts                  ← re-export from yua-shared
      sdk.ts                    ← SDK 전용 타입 (config, options)

    utils/
      retry.ts                  ← 지수 백오프 재시도
      logger.ts                 ← SDK 내부 로깅
```

### 3.3 핵심 인터페이스 설계

```typescript
// --- SDK Configuration ---

interface YuaClientConfig {
  /** Backend base URL. Default: "https://yuaone.com/api" */
  baseUrl?: string;

  /** 인증 방식 선택 */
  auth:
    | { type: "firebase"; getIdToken: () => Promise<string> }
    | { type: "apiKey"; key: string };

  /** Workspace ID (optional, 대부분의 API에서 필요) */
  workspaceId?: string;

  /** 요청 타임아웃 (ms). Default: 30000 */
  timeout?: number;

  /** 재시도 횟수. Default: 2 */
  retries?: number;

  /** 디버그 로깅 활성화 */
  debug?: boolean;
}

// --- Main Client ---

class YuaClient {
  readonly chat: ChatModule;
  readonly stream: StreamModule;
  readonly workspace: WorkspaceModule;
  readonly project: ProjectModule;
  readonly memory: MemoryModule;
  readonly billing: BillingModule;
  readonly usage: UsageModule;
  readonly user: UserModule;
  readonly apiKey: ApiKeyModule;
  readonly upload: UploadModule;
  readonly voice: VoiceModule;
  readonly share: ShareModule;
  readonly admin: AdminModule;
  readonly instance: InstanceModule;

  constructor(config: YuaClientConfig);

  /** Workspace ID를 런타임에 변경 */
  setWorkspace(workspaceId: string): void;
}
```

### 3.4 모듈별 API 설계

#### ChatModule

```typescript
class ChatModule {
  /** 스레드 생성 */
  createThread(params?: {
    title?: string;
    projectId?: string;
  }): Promise<{ threadId: number; title: string }>;

  /** 스레드 목록 조회 */
  listThreads(params?: {
    projectId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ threads: Thread[]; total: number }>;

  /** 스레드 삭제 */
  deleteThread(threadId: number): Promise<{ ok: boolean }>;

  /** 스레드 제목 변경 */
  updateThreadTitle(threadId: number, title: string): Promise<{ ok: boolean }>;

  /** 메시지 목록 조회 */
  getMessages(threadId: number, params?: {
    limit?: number;
    before?: number;
  }): Promise<{ messages: ChatMessage[] }>;

  /** 메시지 전송 (스트리밍) — StreamModule.subscribe() 반환 */
  send(threadId: number, params: {
    content: string;
    attachments?: Attachment[];
    model?: string;
  }): Promise<StreamSubscription>;

  /** 메시지 전송 (비스트리밍, 완전한 응답 대기) */
  sendAndWait(threadId: number, params: {
    content: string;
    attachments?: Attachment[];
    model?: string;
  }): Promise<{ message: ChatMessage }>;
}
```

#### StreamModule

```typescript
class StreamModule {
  /** SSE 스트림 구독 */
  subscribe(threadId: number): StreamSubscription;

  /** 스트림 중단 */
  abort(threadId: number): Promise<{ ok: boolean }>;
}

interface StreamSubscription {
  /** 이벤트 리스너 등록 */
  on(event: "token", handler: (data: { token: string }) => void): this;
  on(event: "stage", handler: (data: { stage: YuaStreamStage }) => void): this;
  on(event: "final", handler: (data: { finalText: string }) => void): this;
  on(event: "suggestion", handler: (data: { items: YuaSuggestion[] }) => void): this;
  on(event: "activity", handler: (data: ActivityEventPayload) => void): this;
  on(event: "memory", handler: (data: MemoryStreamPayload) => void): this;
  on(event: "reasoning_block", handler: (data: ReasoningBlock) => void): this;
  on(event: "done", handler: () => void): this;
  on(event: "error", handler: (error: YuaApiError) => void): this;

  /** 스트림 수동 종료 */
  close(): void;

  /** 전체 응답 텍스트를 Promise로 수집 (편의 메서드) */
  collect(): Promise<string>;
}
```

#### WorkspaceModule

```typescript
class WorkspaceModule {
  /** 현재 워크스페이스 정보 */
  getCurrent(): Promise<Workspace>;

  /** 워크스페이스 목록 */
  list(): Promise<{ workspaces: Workspace[] }>;

  /** 멤버 목록 */
  getMembers(workspaceId?: string): Promise<{ members: WorkspaceMember[] }>;

  /** 멤버 초대 */
  inviteMember(email: string, role: WorkspaceRole): Promise<{ ok: boolean }>;

  /** 멤버 역할 변경 */
  updateMemberRole(userId: number, role: WorkspaceRole): Promise<{ ok: boolean }>;

  /** 멤버 제거 */
  removeMember(userId: number): Promise<{ ok: boolean }>;

  /** 워크스페이스 설정 변경 */
  updateSettings(settings: Partial<WorkspaceSettings>): Promise<{ ok: boolean }>;
}
```

#### AdminModule (콘솔 전용)

```typescript
class AdminModule {
  /** 전체 사용자 목록 (페이지네이션) */
  listUsers(params?: {
    query?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ users: AdminUser[]; total: number }>;

  /** 사용자 상세 */
  getUser(userId: number): Promise<AdminUser>;

  /** 사용자 비활성화/활성화 */
  setUserStatus(userId: number, active: boolean): Promise<{ ok: boolean }>;

  /** 전체 워크스페이스 목록 */
  listWorkspaces(params?: {
    query?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ workspaces: AdminWorkspace[]; total: number }>;

  /** 시스템 통계 */
  getSystemStats(): Promise<SystemStats>;

  /** 실시간 모니터링 SSE */
  monitorStream(): StreamSubscription;

  /** 에러 로그 */
  getErrorLogs(params?: {
    level?: "error" | "warn";
    since?: string;
    limit?: number;
  }): Promise<{ logs: ErrorLog[] }>;
}
```

### 3.5 에러 핸들링

```typescript
class YuaApiError extends Error {
  readonly status: number;
  readonly code: string;         // e.g. "workspace_access_denied", "invalid_token"
  readonly requestId?: string;

  /** 재시도 가능한 에러인지 */
  get isRetryable(): boolean;    // 429, 502, 503, 504

  /** 인증 관련 에러인지 */
  get isAuthError(): boolean;    // 401, 403
}

// SDK 내부: 401 수신 시 자동으로 Firebase token 갱신 후 1회 재시도
// SDK 내부: 429 수신 시 Retry-After 헤더 존중
```

### 3.6 타입 시스템

SDK는 자체 타입을 정의하지 않고, `yua-shared`에서 re-export한다:

```typescript
// yua-sdk/src/types/index.ts
export type {
  // Chat
  ChatThread,
  ChatMessage,
  Attachment,
} from "yua-shared/chat/chat-types";

export type {
  // Stream
  YuaStreamStage,
  YuaStreamEventKind,
  YuaSuggestion,
} from "yua-shared/stream/types";

export type {
  // Activity
  ActivityEventPayload,
  ActivityKind,
} from "yua-shared/stream/activity";

export type {
  // Memory
  MemoryStreamPayload,
  MemoryStreamOp,
} from "yua-shared/memory/types";

export type {
  // Plan/Billing
  PlanId,
  PlanPolicy,
} from "yua-shared/plan/plan.types";

export type {
  // Workspace
  WorkspaceRole,
} from "yua-shared/workspace/workspace-types";
```

`yua-shared`에 부족한 타입이 있으면 `yua-shared`에 추가하고, SDK/Console 양쪽에서 import.

### 3.7 사용 예시

#### 기본 사용

```typescript
import { YuaClient } from "@yua/sdk";
import { getAuth } from "firebase/auth";

const yua = new YuaClient({
  baseUrl: "https://yuaone.com/api",
  auth: {
    type: "firebase",
    getIdToken: () => getAuth().currentUser!.getIdToken(),
  },
  workspaceId: "ws_abc123",
});

// 스레드 생성 + 메시지 전송
const { threadId } = await yua.chat.createThread({ title: "Test" });

// 스트리밍 응답
const stream = await yua.chat.send(threadId, {
  content: "안녕하세요, YUA!",
});

stream.on("token", ({ token }) => process.stdout.write(token));
stream.on("done", () => console.log("\n[완료]"));

// 또는 전체 응답 한번에
const fullText = await stream.collect();
```

#### API Key 인증 (서버 사이드)

```typescript
const yua = new YuaClient({
  auth: { type: "apiKey", key: process.env.YUA_API_KEY! },
});

const { threads } = await yua.chat.listThreads({ limit: 10 });
```

#### Console에서 Admin 기능

```typescript
// 실시간 모니터링
const monitor = yua.admin.monitorStream();

monitor.on("active_streams", (data) => {
  updateDashboard(data.count);
});

monitor.on("error_alert", (data) => {
  showNotification(data.message);
});

// 사용자 검색
const { users, total } = await yua.admin.listUsers({
  query: "test@example.com",
  limit: 20,
});
```

#### 에러 핸들링

```typescript
import { YuaApiError } from "@yua/sdk";

try {
  await yua.chat.send(threadId, { content: "..." });
} catch (e) {
  if (e instanceof YuaApiError) {
    if (e.isAuthError) {
      // 로그인 페이지로 리다이렉트
      router.push("/login");
    } else if (e.code === "usage_limit_exceeded") {
      // 업그레이드 안내
      showUpgradeModal();
    }
  }
}
```

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
