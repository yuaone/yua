# yua-web — CLAUDE SSOT

## 절대 규칙
- pnpm 전역 설치/업데이트 금지 (루트 CLAUDE.md SSOT 준수)
- 의존성 추가: `pnpm --filter yua-web add <dep>` / dev: `pnpm --filter yua-web add -D <dep>`
- 공유 타입/계약은 `yua-shared`에서만 수정 (절대 복제 금지)

## Stack
- Next.js 14.2.35 (App Router) + React 18.2.0
- Tailwind 3.4.10 + Framer Motion
- Zustand ^5 (상태관리)
- Firebase 12.7.0 (인증)
- Markdown/Math(KaTeX)/Mermaid/Prism 렌더링
- yua-shared (workspace dependency)

## Dev/Build
```bash
pnpm --filter yua-web dev    # 0.0.0.0:3000, NEXT_DISABLE_SWC_PATCH=1
pnpm --filter yua-web build
pnpm --filter yua-web lint
```

## TS/Paths (SSOT)
- `@/*` → `src/*`
- `yua-shared` → `../yua-shared/src/index.ts`
- `yua-shared/*` → `../yua-shared/src/*`

## API 연결
- `.env.local`: `NEXT_PUBLIC_API_BASE_URL=http://34.50.27.221:4000`
- `next.config.js` rewrites: `/api/:path*` → `http://127.0.0.1:4000/api/:path*`

## 라우트 구조 (`src/app/`)

| Route | 인증 | 설명 |
|-------|------|------|
| `/` | - | EntryClient (랜딩) |
| `/chat` | O | 채팅 오버뷰 (스레드 목록) |
| `/chat/[threadid]` | O | 개별 채팅 스레드 (ChatMain) |
| `/project/[id]` | O | 프로젝트 페이지 (WIP) |
| `/studio` | - | 스튜디오 허브 → /studio/image 리다이렉트 |
| `/studio/image` | - | 이미지 생성 |
| `/studio/document` | - | 문서 스튜디오 |
| `/studio/video` | - | 비디오 스튜디오 |
| `/workspace` | - | 워크스페이스 전환/팀 관리 |
| `/onboarding` | - | 온보딩 → /chat 리다이렉트 |
| `/upgrade` | - | 빌링 업그레이드 |
| `/join/[token]` | - | 워크스페이스 초대 참여 |
| `/guide` | - | 가이드 |
| `/policies/*` | - | 개인정보/이용약관 |

## 핵심 디렉토리

### Components (`src/components/`) — 72개
- `chat/` (39개) — ChatMain, ChatMessage, ChatMessageList, ChatInput, AssistantMessage, DeepThinkingDrawer, ThinkingPanel, StreamOverlay, SuggestionBlock, QuickPromptBar 등
- `auth/` — AuthGate, LoginModal
- `layout/` — AppSidebar, SidebarContext
- `sidebar/` — 사이드바 UI
- `studio/` — StudioRoot
- `billing/` — 빌링/업그레이드 UI
- `workspace/` — WorkspaceTeamPanel
- `settings/` — SettingsModal
- `ui/` — 기본 UI 요소

### Hooks (`src/hooks/`)
| Hook | 크기 | 역할 |
|------|------|------|
| `useChatStream.ts` | 49KB | SSE 스트리밍 코어 (StreamClient, activity) |
| `useChatMessages.ts` | - | 메시지 CRUD |
| `useChatSender.ts` | - | 메시지 전송 |
| `useSidebarData.ts` | - | 스레드/프로젝트 로딩 |
| `useBillingGuard.ts` | - | 빌링 체크 |
| `useThemePreference.ts` | - | 다크모드 토글 |
| `useWorkspaceTransition.ts` | - | 워크스페이스 전환 |
| `useActionPreview.ts` | - | 액션 프리뷰 애니메이션 |

### Store (`src/store/`) — Zustand
- `useChatStore.ts` — messagesByThread, currentThreadId, streamState
- `useSidebarStore.ts` — activeThread, threads, projects
- `useStreamSessionStore.ts` — thinking summaries, performance
- `useWorkspaceStore.ts` — activeWorkspaceId
- `useMemoryIndicator.ts` / `useMemoryDrawer.ts`

### Context
- `src/contexts/AuthContext.tsx` (12KB) — Firebase 인증 상태머신
  - States: `booting` | `guest` | `guest_booting` | `authed` | `onboarding_required`
  - Methods: signIn, signUp, logout, ensureGuestSession, linkAccount, getToken, authFetch

### API 클라이언트 (`src/lib/api/`)
- `project.ts`, `billing.api.ts`, `studio.ts`, `document.ts`, `sidebar.api.ts`
- `types.ts` — AuthFetch 타입

## CSS/Theme (SSOT)
- `globals.css` — CSS 변수 토큰 시스템
  - `--chat-max-w: 960px`, `--chat-pad-x: 18px`
  - `--ink`, `--ink-2`, `--line`, `--wash` (컬러)
  - `--sb-bg`, `--sb-panel`, `--sb-active-bg` (사이드바)
- 다크모드: `html.dark` 클래스 기반 + `dark:` 유틸리티
- 반응형: Mobile / Tablet (768-1023px) / Desktop

## Providers (`src/app/providers.tsx`)
- AuthProvider → ActionPreviewProvider → LoginModal + BillingWarningBanner + ThemeBootstrap

## UI 변경 시 주의
- "CSS로 해결 vs 상태머신으로 해결" 경계가 중요
  - 렌더 타이밍/stream lifecycle 문제는 CSS로 못 고침
- 변경 전: 해당 화면/컴포넌트의 렌더 트리(부모→자식)부터 확인
- 변경 후: 최소 `lint` 또는 `dev` 확인

## 구현 현황
- 완료: 채팅(스트리밍/thinking), 인증, 마크다운 렌더링, 워크스페이스, 다크모드, 사이드바, 빌링가드, 설정, 정책페이지
- WIP: `/project/[id]` (null 반환), Studio 페이지 (구조만)
