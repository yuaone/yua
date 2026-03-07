# yua-mobile — CLAUDE SSOT

## 절대 규칙
- pnpm 전역 설치 금지
- deps 변경: `pnpm --filter yua-mobile add <dep>`
- 공유 타입/계약은 `yua-shared`에서만 수정 (절대 복제 금지)
- 네이티브/빌드 의존성 추가 시 `onlyBuiltDependencies` 영향 확인

## Stack
- Expo SDK 54 + React Native 0.81.5 + React 19.1.0
- Expo Router v6 (file-based routing, typed routes)
- Firebase 12.7.0 (인증)
- Zustand (상태관리)
- react-native-reanimated, react-native-gesture-handler
- react-native-markdown-display + markdown-it
- yua-shared (workspace dependency)

## Dev/Build
```bash
pnpm --filter yua-mobile start       # expo start
pnpm --filter yua-mobile android     # expo start --android
pnpm --filter yua-mobile ios         # expo start --ios
pnpm --filter yua-mobile lint        # expo lint
```

## 앱 설정 (app.json)
- Bundle ID: `com.yuaone.yua` (iOS + Android)
- New Architecture: enabled
- React Compiler: enabled
- Typed Routes: enabled
- EAS Project ID: `4868ce71-a1b7-468d-91c2-ed3e506dd53e`

## 환경변수 (`.env`)
- `EXPO_PUBLIC_API_BASE_URL` — 백엔드 API (기본: `http://127.0.0.1:4000`)
- `EXPO_PUBLIC_FIREBASE_*` — Firebase 설정
- `EXPO_PUBLIC_GOOGLE_*` — Google OAuth 클라이언트 ID (Android/iOS/Web)
- `EXPO_PUBLIC_WEB_BASE_URL` — 웹앱 URL

## 라우트 구조 (`app/`)

| Route | 인증 | 설명 |
|-------|------|------|
| `/` | - | IndexRouteGuard (인증 상태 기반 라우팅) |
| `/intro` | - | 스플래시 (로고 애니메이션, 5초 후 /auth) |
| `/auth` | - | 로그인/회원가입 (이메일 + Google OAuth) |
| `/onboarding` | - | 프로필 설정 |
| `/welcome` | - | 웰컴 스크린 |
| `/(authed)/chat` | O | 채팅 |
| `/(authed)/chat/[threadId]` | O | 개별 스레드 |
| `/(authed)/project/[projectId]` | O | 프로젝트 |
| `/legal/terms` | - | 이용약관 |
| `/legal/privacy` | - | 개인정보처리방침 |

## 핵심 디렉토리

### Features (`features/`)
- `chat/screens/` — MobileChatScreen, MobileProjectOverviewScreen
- `chat/hooks/` — useMobileChatController, useMobileChatSender, useMobileChatStreamSession
- `chat/model/` — chat-message.types, stream-event.mapper
- `project/` — screens, components, hooks

### Components (`components/`)
- `chat/` — ChatInput, MessageList, MobileChatMessageList, MobileAssistantMessage, MessageBubble
  - `input/` — 입력 패널
  - `blocks/` — 메시지 블록
  - `image/` — 이미지 렌더링
  - `primitives/` — Stack, Panel, Timeline, Card
  - `streams/` — 스트림 관련
- `auth/`, `layout/`, `sidebar/`, `panel/`, `activity/`, `common/`

### Store (`store/`) — Zustand
- `useMobileChatStore.ts` — 채팅 메시지, 활성 어시스턴트
- `useMobileSidebarStore.ts` — 프로젝트, 스레드, 활성 컨텍스트
- `useMobileStreamSessionStore.ts` — 스트리밍 상태
- `useMobileShellStore.ts` — 셸/네비게이션 상태
- `useMobileThreadStore.ts` — 스레드 데이터

### Hooks (`hooks/`)
- `useMobileChatStream.ts` — SSE 스트리밍 코어
- `useMobileSidebarData.ts` — 사이드바 데이터 로딩
- `useMobileThinkingProfile.ts` — 사고 프로필
- `useMobileLocalNotifications.ts` — 푸시 알림
- `useKeyboardDock.ts` — 키보드 도킹
- `useTopPanel.ts` — 상단 패널

### 인증 (`contexts/MobileAuthContext.tsx`, 446줄)
- States: `booting` | `guest` | `guest_booting` | `authed` | `onboarding_required` | `error`
- Methods: loginWithEmail, signupWithEmail, signInWithGoogleToken, completeOnboarding, signOutUser, getToken, authFetch
- SecureStore로 세션 영속화

### API (`lib/api/`)
- `chat.api.ts` — 메시지 로드/전송
- `sidebar.api.ts` — 프로젝트/스레드 로드
- `photo-library.api.ts` — 디바이스 사진
- `mobileApiClient.ts` — 공통 API 클라이언트

### Stream Adapter (`adapters/stream/`)
- `createMobileStreamClient.ts` — yua-shared의 StreamClient 래핑
- `mobileStreamTransport.ts` — 모바일 SSE 전송

## 디자인 원칙 (SSOT)
- yua-web과 **동일 로직** 구현, 모바일 래퍼로 감싸는 방식
- 공통 비즈니스 로직은 yua-shared 계약 기반
- UI만 React Native로 변환, 상태/API/스트리밍 흐름은 웹과 동일

## 구현 현황
- 완료: 인증, 채팅 UI, 스트리밍, 푸시 알림, 사이드바, 첨부파일, 사고 프로필, 제안, 온보딩
- WIP: welcome/overview 스크린, 프로젝트 오버뷰, (tabs) 레이아웃, 법적 페이지 콘텐츠
