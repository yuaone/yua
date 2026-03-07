# YUA-MOBILE BLUEPRINT v1.0
# 이 문서는 모든 에이전트가 참조하는 SSOT 설계 문서입니다.
# 웹(yua-web) 100% 동일 재현이 목표입니다.

---

## 1. APP LIFECYCLE (앱 시작 흐름)

```
[Cold Start]
    |
    v
index.tsx (IndexRouteGuard)
    |
    +--> [첫 설치] --> /intro (로고 회전 4초) --> /auth
    |
    +--> [미인증] --> /auth
    |
    +--> [온보딩 미완료] --> /onboarding
    |
    +--> [인증 완료 (authed)] --> /(authed)/chat  <-- 대부분의 진입점
```

### 세션 영속화 (핵심)
- Firebase Auth + SecureStore로 토큰 영속 저장
- 앱 삭제 또는 수동 로그아웃 전까지 자동 로그인
- `state === "authed"` 이면 intro/auth 전부 스킵 -> 바로 `/(authed)/chat`
- 웹의 `AuthContext` 상태머신과 동일: `booting -> guest -> authed`

### 인증 화면 (/auth)
- 웹 동일: Google 로그인 (primary) + 이메일/비밀번호 (secondary) + 회원가입
- Google OAuth: `expo-auth-session` + Firebase credential
- 이메일: Firebase `signInWithEmailAndPassword` / `createUserWithEmailAndPassword`
- 성공 시: `/me` API 호출 -> profile sync -> state = "authed" -> router.replace("/(authed)/chat")
- 온보딩 필요 시: state = "onboarding_required" -> /onboarding

### 온보딩 (/onboarding)
- 1회성: 프로필 설정 (이름, 직군 등)
- 완료 시: `completeOnboarding()` -> state = "authed" -> /(authed)/chat
- 웹은 /onboarding -> /chat redirect. 모바일도 동일.

---

## 2. AUTHED LAYOUT (인증 후 쉘)

웹의 `(authed)/layout.tsx` 를 모바일로 100% 재현.

### 웹 구조 (SSOT 참조)
```
AuthedLayout
  +-- Sidebar (desktop: 350px 고정 | mobile: overlay slide)
  +-- Main Area
  |     +-- /chat -> ChatOverview
  |     +-- /chat/[threadId] -> ChatMain
  |     +-- /project/[id] -> ProjectOverview
  +-- DeepThinkingDrawer (desktop: 오른쪽 패널 | mobile: overlay)
  +-- SettingsModal
  +-- StudioRoot
```

### 모바일 매핑
```
(authed)/_layout.tsx
  +-- MobileAppShell (전체 래퍼)
  |     +-- MobileSidebarPanel (왼쪽 스와이프 드로어)
  |     +-- Stack Navigator
  |     |     +-- chat/index -> MobileChatOverview (= 웹 ChatOverview)
  |     |     +-- chat/[threadId] -> MobileChatScreen (= 웹 ChatMain)
  |     |     +-- project/[projectId] -> MobileProjectScreen
  |     +-- MobileDeepThinkingDrawer (바텀시트)
  |     +-- MobileSettingsModal
```

### 사이드바 동작
- 웹: desktop은 왼쪽 고정, mobile은 hamburger -> slide overlay
- 모바일 앱: 항상 왼쪽 스와이프 드로어 (react-native-gesture-handler)
  - 햄버거 버튼 탭 또는 왼쪽 edge 스와이프로 열기
  - 바깥 탭 또는 오른쪽 스와이프로 닫기
  - 스레드 목록, 프로젝트 목록, 새 채팅 버튼

---

## 3. CHAT OVERVIEW (/(authed)/chat)

웹의 `ChatOverview.tsx` 100% 재현.

### UI 구성
```
MobileChatOverview
  +-- TopBar (햄버거 + "YUA" 로고)
  +-- ScrollView
  |     +-- "무엇을 도와드릴까요?" (h1)
  |     +-- "질문, 분석, 문서 작성까지..." (subtitle)
  |     +-- 최근 채팅 목록 (recent 5개, 현재 프로젝트 필터)
  |     +-- ChatInput (메시지 입력)
  +-- Disclaimer footer
```

### 로직 (웹 동일)
1. ChatInput에서 메시지 전송 시:
   - `createThread(authFetch, null)` -> threadId 생성
   - `addThread()` -> 사이드바에 추가
   - `setActiveThread(threadId)` -> ChatStore 활성화
   - `send({ threadId, content, attachments })` -> SSE 스트리밍 시작
   - `router.push("/(authed)/chat/${threadId}")` -> 채팅 화면 이동
2. 최근 채팅 탭 시: `setActiveContext()` -> `router.push()`

---

## 4. CHAT MAIN (/(authed)/chat/[threadId])

웹의 `ChatMain.tsx` 100% 재현. 이것이 앱의 핵심 화면.

### UI 구성
```
MobileChatScreen
  +-- TopBar (뒤로가기 + 스레드 제목 + 메뉴)
  +-- FlatList (메시지 목록, 가상화)
  |     +-- UserMessage (사용자 메시지 버블)
  |     +-- AssistantMessage (AI 응답 버블)
  |     |     +-- StreamOverlay (스트리밍 상태 표시)
  |     |     |     +-- TypingIndicator (타이핑 중...)
  |     |     |     +-- ThinkingPanel (사고 과정 패널)
  |     |     +-- Markdown (마크다운 렌더링)
  |     |     +-- SuggestionBlock (추천 질문)
  |     +-- "아래로" 플로팅 버튼
  +-- ChatInput (하단 고정, 키보드 대응)
  |     +-- 첨부 버튼 (+)
  |     +-- 텍스트 입력
  |     +-- 마이크 버튼
  |     +-- 전송 버튼
  +-- Disclaimer ("YUA는 실수할 수 있습니다...")
```

### 스트리밍 플로우 (웹 동일, yua-shared StreamClient 사용)
```
사용자 전송
  -> sendPrompt({ threadId, content, attachments, thinkingProfile })
  -> StreamClient.start() (SSE 연결)
  -> onReady -> /api/chat/prompt POST
  -> onToken -> patchAssistant(token) -> UI 업데이트
  -> onActivity -> StreamSession 업데이트 (사고 과정)
  -> onFinal -> finalizeAssistant() -> 스트리밍 종료
  -> onDone -> 클린업
```

### 메시지 렌더링
- UserMessage: 오른쪽 정렬, 버블 스타일
- AssistantMessage: 왼쪽 정렬, 마크다운 렌더링
  - 마크다운: react-native-markdown-display
  - 코드블록: 구문 하이라이팅
  - 수학: 추후 지원 (WebView 기반)
  - 이미지: expo-image
  - 테이블: 가로 스크롤 테이블

### ThinkingPanel (사고 과정)
- FAST: 타이핑 인디케이터만
- NORMAL: 인라인 사고 요약
- DEEP: 확장 가능한 ThinkingPanel
  - 경과 시간 표시
  - 사고 단계 (분석중, 계획중, 검증중...)
  - 탭하면 DeepThinkingDrawer (바텀시트) 열기

---

## 5. STORE 아키텍처 (웹 Zustand 패턴 동일)

### 필수 Store 목록

| Store | 웹 원본 | 역할 |
|-------|---------|------|
| `useMobileChatStore` | useChatStore | messagesByThread, streaming, finalized |
| `useMobileSidebarStore` | useSidebarStore | threads, projects, activeContext |
| `useMobileStreamSessionStore` | useStreamSessionStore | thinking, chunks, summaries |
| `useMobileWorkspaceStore` | useWorkspaceStore | activeWorkspaceId |

### ChatStore 필수 기능 (웹 동일)
- `messagesByThread: Record<number, ChatMessageWithMeta[]>`
- `hydrateMessages(threadId, messages)` - 서버에서 메시지 로드
- `addUserMessage(content, threadId, attachments?)`
- `addAssistantMessage(threadId, traceId, thinkingMeta?)`
- `patchAssistant(id, delta)` - 토큰 추가 (스트리밍)
- `finalizeAssistant(id)` - FINAL 처리
- `patchAssistantMeta(id, meta)` - 메타 업데이트
- `setFeedback(messageId, action)` - 좋아요/싫어요

### SidebarStore 필수 기능 (웹 동일)
- `threads: Thread[]`, `projects: Project[]`
- `activeThreadId`, `activeProjectId`
- `addThread()`, `renameThread()`, `deleteThread()`, `togglePin()`
- 정렬: pinned first -> lastActiveAt desc

---

## 6. API 엔드포인트 (백엔드 동일)

모든 API는 `authFetch` (Bearer token) 사용.
Base URL: `EXPO_PUBLIC_API_BASE_URL`

| Method | Path | 용도 |
|--------|------|------|
| GET | /api/chat/threads | 스레드 목록 |
| POST | /api/chat/threads | 스레드 생성 |
| GET | /api/chat/messages?threadId=N | 메시지 로드 |
| POST | /api/chat/prompt | 메시지 전송 (SSE 트리거) |
| GET | /api/stream/stream?threadId=N | SSE 스트림 연결 |
| GET | /api/me | 프로필 조회 |
| POST | /api/me | 프로필 저장 |
| GET | /api/projects | 프로젝트 목록 |
| POST | /api/chat/feedback | 피드백 저장 |
| GET | /api/chat/snapshot?traceId=X | Deep thinking 스냅샷 |

---

## 7. NAVIGATION 구조 (최종)

```
app/
  _layout.tsx              -- RootLayout (GestureHandler + Theme + AuthProvider)
  index.tsx                -- IndexRouteGuard (auth 분기)
  intro/index.tsx          -- Intro (로고 4초)
  auth/index.tsx           -- Login/Signup/Google
  onboarding/index.tsx     -- 온보딩
  (authed)/
    _layout.tsx            -- AuthedLayout (인증 가드 + 사이드바 쉘 + 알림)
    chat/
      index.tsx            -- MobileChatOverview (= 웹 ChatOverview)
      [threadId].tsx       -- MobileChatScreen (= 웹 ChatMain)
    project/
      [projectId].tsx      -- MobileProjectScreen
  legal/
    terms/index.tsx
    privacy/index.tsx
```

---

## 8. COMPONENT 매핑 (웹 -> 모바일)

### Layout
| 웹 컴포넌트 | 모바일 컴포넌트 | 상태 |
|------------|----------------|------|
| AuthedLayout | (authed)/_layout.tsx + MobileAppShell | 리팩토링 필요 |
| AppSidebar | MobileSidebarPanel | 있음, 개선 필요 |
| SidebarContext | 사이드바 open/close 상태 | 구현 필요 |

### Chat
| 웹 컴포넌트 | 모바일 컴포넌트 | 상태 |
|------------|----------------|------|
| ChatOverview | MobileChatOverview | 새로 작성 |
| ChatMain | MobileChatScreen | 있음, 개선 필요 |
| ChatMessageList | MobileChatMessageList | 있음 |
| ChatMessage | MobileChatMessageItem | 있음 |
| AssistantMessage | MobileAssistantMessage | 있음, 개선 필요 |
| ChatInput | ChatInput | 있음 |
| StreamOverlay | MobileStreamOverlay | 있음, 개선 필요 |
| ThinkingPanel | MobileThinkPanel | 있음, 개선 필요 |
| TypingIndicator | 새로 작성 | 필요 |
| DeepThinkingDrawer | MobileDeepThinkingDrawer (바텀시트) | 새로 작성 |
| SuggestionBlock | MobileSuggestionBlock | 있음 |
| Markdown | MobileMarkdown | 있음 |

### Auth
| 웹 컴포넌트 | 모바일 컴포넌트 | 상태 |
|------------|----------------|------|
| AuthGate | (authed)/_layout 가드 | 있음 |
| LoginModal | auth/index.tsx (전체 화면) | 있음 |
| AuthContext | MobileAuthContext | 있음 |

---

## 9. DESIGN SPEC (웹 동일)

### 색상 토큰 (다크모드 지원)
```
Light:
  --surface-main: #ffffff
  --surface-sidebar: #f8f8f8
  --surface-panel: #f4f4f4
  --text-primary: #111111
  --text-secondary: #374151
  --text-muted: #9ca3af
  --line: rgba(0,0,0,0.08)
  --wash: rgba(0,0,0,0.03)

Dark:
  --surface-main: #111111
  --surface-sidebar: #1a1a1a
  --surface-panel: #1e1e1e
  --text-primary: #f5f5f5
  --text-secondary: #d1d5db
  --text-muted: #6b7280
  --line: rgba(255,255,255,0.08)
  --wash: rgba(255,255,255,0.03)
```

### 타이포그래피
- 본문: 15px (system font)
- 제목 (h1): 28px mobile, 32px tablet
- 부제목 (h2): 20px
- 코드: 13px (monospace)
- 입력: 15px
- 면책조항: 11px

### 간격
- 메시지 간 gap: 8px (gap-2)
- 사용자 메시지 mb: 20px (mb-5)
- AI 메시지 mt: 4px, mb: 12px
- 채팅 좌우 패딩: 18px (--chat-pad-x)
- 채팅 최대 너비: 960px (태블릿에서)

### 메시지 버블
- 사용자: 오른쪽 정렬, bg: var(--wash), rounded-2xl, px-4 py-3
- AI: 왼쪽 전체 너비, 배경 없음, 마크다운 렌더링

### 입력바
- 하단 고정 (KeyboardAvoidingView)
- SafeArea bottom 대응
- 왼쪽: + (첨부), 가운데: TextInput (multiline), 오른쪽: mic + send
- send 버튼: 내용 있을 때만 활성화

---

## 10. AGENT 배치 계획

### Agent 1: Foundation (기반 정비)
**담당:** tsconfig, store 리팩토링, 타입 SSOT 정리
- [ ] tsconfig.json에 yua-shared 경로 추가
- [ ] MobileAuthProfile -> AuthProfile (yua-shared) 통일
- [ ] MobileChatMessage -> ChatMessage (yua-shared) 통일
- [ ] useMobileChatStore -> Zustand create() 표준화 + 웹 기능 추가 (finalized, patchAssistantMeta)
- [ ] useMobileSidebarStore -> 웹 동일 기능 확인

### Agent 2: Auth + Onboarding
**담당:** 인증 흐름 완성
- [ ] IndexRouteGuard: authed면 바로 /(authed)/chat (현재 동작 확인)
- [ ] /intro: 다크모드 대응, 4초 후 auth
- [ ] /auth: 웹 동일 UI (Google primary + email secondary)
- [ ] 세션 영속화: SecureStore 토큰 저장 확인
- [ ] /onboarding: 완성도 확인

### Agent 3: AuthedLayout + Sidebar
**담당:** 인증 후 쉘 구조
- [ ] (authed)/_layout.tsx: MobileAppShell 래핑
- [ ] MobileSidebarPanel: 왼쪽 드로어 (스와이프 + 햄버거)
- [ ] 사이드바 내용: 스레드 목록 + 프로젝트 + 새 채팅 + 설정
- [ ] SidebarContext 또는 상태 공유 (open/close)
- [ ] 사이드바 데이터 로딩 (useMobileSidebarData)

### Agent 4: ChatOverview
**담당:** /chat 오버뷰 화면
- [ ] MobileChatOverview 새로 작성 (웹 ChatOverview 100% 재현)
- [ ] TopBar (햄버거 + YUA)
- [ ] "무엇을 도와드릴까요?" 헤더
- [ ] 최근 채팅 목록 (5개)
- [ ] ChatInput 통합 (새 스레드 생성 -> 전송 -> 이동)
- [ ] Disclaimer footer

### Agent 5: ChatMain (핵심)
**담당:** /chat/[threadId] 채팅 화면
- [ ] MobileChatScreen 리팩토링
- [ ] FlatList 메시지 목록 (가상화, inverted)
- [ ] UserMessage 렌더링
- [ ] AssistantMessage 렌더링
  - [ ] StreamOverlay (TypingIndicator + ThinkingPanel)
  - [ ] Markdown 렌더링
  - [ ] SuggestionBlock
- [ ] ChatInput (하단 고정, 키보드 대응)
- [ ] "아래로" 플로팅 버튼
- [ ] SSE 스트리밍 연동 (useMobileChatStream)
- [ ] 메시지 로드 (hydrateMessages on mount)

---

## 11. 검증 체크리스트 (에이전트 완료 후)

### 기능 검증
- [ ] 앱 시작 -> 자동 로그인 -> /chat 바로 진입
- [ ] 새 채팅: Overview에서 메시지 전송 -> 스레드 생성 -> 채팅 화면 이동
- [ ] 스트리밍: 메시지 전송 -> 타이핑 -> 사고 과정 -> 답변 렌더링
- [ ] 마크다운: 제목, 목록, 볼드, 코드블록, 테이블
- [ ] 사이드바: 스레드 목록, 탭으로 이동, 새 채팅
- [ ] 다크모드: 시스템 설정 따라가기
- [ ] 키보드: 입력 시 레이아웃 안 깨짐
- [ ] 스크롤: 1000개 메시지에서 성능 OK

### 웹 동일성 검증
- [ ] 메시지 간격 동일 (gap-2, mb-5, mt-1 mb-3)
- [ ] 폰트 크기 동일 (본문 15px, 제목 28px)
- [ ] 색상 토큰 동일 (light/dark)
- [ ] 입력바 레이아웃 동일
- [ ] ThinkingPanel 동작 동일 (FAST/NORMAL/DEEP)
- [ ] 사이드바 내용 동일 (스레드, 프로젝트, 정렬)

---

## PHASE 2: AGENT 6-10 (1-5 완료 후 진행)

### Agent 6: 다크모드 + 테마 시스템
**담당:** 전체 앱 색상 토큰 통일, 시스템 설정 연동
- [ ] 색상 토큰 파일 생성 (theme/colors.ts) — light/dark 전체 정의
- [ ] useColorScheme() 기반 시스템 다크모드 자동 연동
- [ ] 모든 화면에 다크모드 적용 (auth, intro, chat, sidebar, overview)
- [ ] StatusBar 색상 연동 (light-content / dark-content)
- [ ] 웹 CSS 변수 (--surface-main, --text-primary 등) → RN 토큰 1:1 매핑
- [ ] 사용자 수동 토글 (선택사항: 시스템 / 라이트 / 다크)

### Agent 7: DeepThinkingDrawer (바텀시트)
**담당:** DEEP 모드 사고 과정 UI
- [ ] @gorhom/bottom-sheet 설치 및 설정
- [ ] MobileDeepThinkingDrawer 컴포넌트 생성
- [ ] ThinkingPanel 탭 시 바텀시트 열기
- [ ] 사고 청크(chunks) 렌더링 — 단계별 요약
- [ ] 사고 경과 시간 표시 (computeDisplayElapsed)
- [ ] 히스토리 스냅샷 로드 (/api/chat/snapshot?traceId=X)
- [ ] 웹 DeepThinkingDrawer와 동일 데이터 표시
- [ ] drawerOpen 메타 상태 연동 (patchAssistantMeta)

### Agent 8: 첨부파일 + 미디어
**담당:** 파일/이미지 첨부, 프리뷰, 업로드
- [ ] + 버튼 탭 시 첨부 패널 (MobilePlusPanel)
- [ ] expo-image-picker: 카메라 촬영, 갤러리 선택
- [ ] expo-document-picker: 파일 첨부 (PDF, CSV, 등)
- [ ] 첨부 프리뷰 행 (AttachmentPreviewRow) — 썸네일 + 파일명 + 삭제
- [ ] 업로드 진행률 표시
- [ ] 이미지 메시지 렌더링 (AssistantMessage 내 이미지 블록)
- [ ] AttachmentMeta (yua-shared) 타입 사용
- [ ] 대용량 파일 제한 (10MB 경고)

### Agent 9: 설정 + 워크스페이스
**담당:** 설정 모달, 워크스페이스 전환, 프로필 관리
- [ ] MobileSettingsModal 컴포넌트 (바텀시트 또는 전체 화면)
  - [ ] 프로필 (이름, 이메일)
  - [ ] 테마 전환 (시스템/라이트/다크)
  - [ ] 사고 프로필 설정 (FAST/NORMAL/DEEP)
  - [ ] 로그아웃 버튼
  - [ ] 버전 정보
- [ ] 워크스페이스 전환 UI
  - [ ] 워크스페이스 목록
  - [ ] 전환 시: store 초기화 + 사이드바 리로드 + /chat 이동
- [ ] useWorkspaceStore 모바일 연동

### Agent 10: QA + 성능 최적화
**담당:** 통합 테스트, 성능 프로파일링, 최종 검수
- [ ] FlatList 가상화 튜닝 (initialNumToRender, maxToRenderPerBatch, windowSize)
- [ ] 1000+ 메시지 성능 테스트
- [ ] 메모리 프로파일링 (React DevTools)
- [ ] SSE 스트리밍 안정성 (네트워크 전환, 백그라운드 복귀)
- [ ] 전체 플로우 검증:
  - [ ] 콜드 스타트 -> 자동 로그인 -> /chat
  - [ ] 새 채팅 -> 전송 -> 스트리밍 -> 완료
  - [ ] 사이드바 -> 스레드 전환
  - [ ] 다크모드 전환
  - [ ] 키보드 올라올 때 레이아웃
  - [ ] 딥링크 (푸시 알림 -> 특정 스레드)
- [ ] 웹 동일성 최종 비교 (스크린샷 대조)
- [ ] lint 0 에러 확인
- [ ] 빌드 확인 (EAS build --profile preview)

---

## 12. 의존성 (추가 필요)

```bash
# 이미 있는 것
expo, expo-router, react-native-reanimated, react-native-gesture-handler
firebase, expo-auth-session, expo-secure-store
react-native-markdown-display, expo-image

# 추가 필요
pnpm --filter yua-mobile add zustand@^5          # 표준 Zustand
pnpm --filter yua-mobile add @gorhom/bottom-sheet # Deep thinking 바텀시트
```

---

## 13. 파일 참조 맵 (에이전트용)

### 웹 원본 (yua-web/src/)
```
app/(authed)/layout.tsx          -- AuthedLayout (사이드바 + 메인 + 드로어)
components/chat/ChatOverview.tsx -- Overview 화면 (최근 채팅 + 입력)
components/chat/ChatMain.tsx     -- 채팅 메인 (메시지 목록 + 입력 + 스트리밍)
components/chat/ChatMessage.tsx  -- 메시지 래퍼 (user/assistant 분기)
components/chat/ChatMessageList.tsx -- 메시지 목록 (gap-2)
components/chat/AssistantMessage.tsx -- AI 응답 (마크다운 + 사고 + 제안)
components/chat/StreamOverlay.tsx -- 스트리밍 오버레이 (typing + thinking)
components/chat/ThinkingPanel.tsx -- 사고 과정 패널
components/chat/ChatInput.tsx    -- 입력바
components/layout/AppSidebar.tsx -- 사이드바
components/common/Markdown.tsx   -- 마크다운 렌더러
store/useChatStore.ts            -- 채팅 스토어
store/useSidebarStore.ts         -- 사이드바 스토어
store/useStreamSessionStore.ts   -- 스트림 세션 스토어
hooks/useChatStream.ts           -- SSE 스트리밍 훅
contexts/AuthContext.tsx         -- 인증 컨텍스트
```

### 모바일 현재 (yua-mobile/)
```
app/_layout.tsx                  -- Root (Theme + Auth + Stack)
app/index.tsx                    -- IndexRouteGuard
app/intro/index.tsx              -- Intro (로고 회전)
app/auth/index.tsx               -- Login/Signup
app/onboarding/index.tsx         -- 온보딩
app/(authed)/_layout.tsx         -- Auth 가드 + Stack
app/(authed)/chat/index.tsx      -- MobileChatScreen (현재)
app/(authed)/chat/[threadId].tsx -- MobileChatScreen (현재)
contexts/MobileAuthContext.tsx   -- 인증
store/useMobileChatStore.ts      -- 채팅 (리팩토링 필요)
store/useMobileSidebarStore.ts   -- 사이드바
hooks/useMobileChatStream.ts     -- SSE 스트리밍
features/chat/screens/MobileChatScreen.tsx -- 채팅 메인 화면
```

### 공유 타입 (yua-shared/src/)
```
stream/stream-client.ts          -- StreamClient (SSE)
stream/stream-reducer.ts         -- reduceStreamState()
stream/activity.ts               -- ActivityKind, ActivityItem
stream/types.ts                  -- StreamPayload, StreamClientHandlers
types/thinkingProfile.ts         -- ThinkingProfile, ThinkingContract
chat/chat-types.ts               -- ChatMessage, ChatThread
auth/auth-types.ts               -- AuthProfile, AuthUser
```
