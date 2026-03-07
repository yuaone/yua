# YUA-Web 모바일/태블릿 디자인 리포트

22개 파일 전수 분석 결과

## 1. 현재 디자인 시스템

### CSS 변수 토큰
- `--chat-max-w: 960px`, `--chat-pad-x: 18px`
- 컬러: `--ink`, `--ink-2`, `--line`, `--wash`, `--text-primary/secondary/muted`
- 사이드바: `--sb-bg`, `--sb-panel`, `--sb-active-bg`
- 다크모드: `html.dark` 클래스 기반

### Breakpoint 체계
- `lg:` = 1024px+ (데스크톱)
- `md:` = 768px+ (태블릿)
- `max-lg:` = 1023px 이하
- `max-md:` = 767px 이하

### 잘 된 점
- 레이아웃 분기(isDesktop JS + lg:hidden CSS) 안정적
- 사이드바 모바일 오버레이+슬라이드 잘 구현
- ChatInput iOS auto-zoom 방지 (16px) 적용됨
- DeepThinking Drawer mobile/desktop variant 분리 우수
- CSS 변수 다크모드 시스템 체계적

---

## 2. P0: 즉시 수정 (깨지는 레이아웃)

### 2-1. SettingsModal — 모바일 오버플로우
**파일:** `src/components/settings/SettingsModal.tsx:29`
**문제:** `w-[920px]` 고정 → 모바일에서 뷰포트 밖으로 넘침
**수정:**
```
old: w-[920px]
new: w-[920px] max-lg:w-[95vw] max-lg:h-[90vh] max-md:w-full max-md:h-full max-md:rounded-none max-lg:flex-col
```

### 2-2. ImageModal — 네비게이션 버튼 화면 밖
**파일:** `src/components/chat/image/ImageModal.tsx:106,121`
**문제:** `left-[-56px]` / `right-[-56px]` → 모바일에서 화면 밖
**수정:**
```
old: left-[-56px]
new: left-2 lg:left-[-56px] bg-black/40 lg:bg-transparent rounded-full

old: right-[-56px]
new: right-2 lg:right-[-56px] bg-black/40 lg:bg-transparent rounded-full
```

### 2-3. LoginModal — 다크모드 미지원 + 모바일 마진 없음
**파일:** `src/components/auth/LoginModal.tsx:69`
**문제:** `bg-white` 하드코딩, 외부 마진 없어 화면 끝까지 붙음
**수정:**
```
old: w-full max-w-[480px] bg-white rounded-2xl shadow-2xl
new: w-full max-w-[480px] max-md:max-w-[95vw] bg-white dark:bg-[#1b1b1b] rounded-2xl shadow-2xl mx-4
```

### 2-4. BillingWarningBanner — 다크모드 + 모바일 레이아웃
**파일:** `src/components/global/BillingWarningBanner.tsx:70,119`
**문제:** 다크모드 미지원 + `p-8` 과도 + 버튼 줄바꿈 안 됨
**수정:**
```
old: p-8
new: p-8 max-md:p-4

old: flex ... gap-3
new: flex flex-wrap ... gap-3
```

---

## 3. P1: 중요 UX 개선

### 3-1. ChatMain 상단바 — safe-area 누락
**파일:** `src/components/chat/ChatMain.tsx:538-553`
**문제:** `safe-area-inset-top` 미적용 (ChatOverview에는 적용됨)
**수정:** top bar에 `pt-[env(safe-area-inset-top)]` 추가

### 3-2. Mobile Sidebar — safe-area 미적용
**파일:** `src/app/(authed)/layout.tsx:162-173`, `src/components/layout/AppSidebar.tsx:206`
**문제:** 사이드바에 `safe-area-inset-top/bottom` 없음
**수정:** 사이드바 컨테이너에 `pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]` 추가

### 3-3. MessageActions — 터치 타겟 미달
**파일:** `src/components/chat/MessageActions.tsx:124-184`
**문제:** 이모지 버튼 padding 없음 → 터치 타겟 ~20px (최소 44px 필요)
**수정:**
```
old: yua-action-btn
new: yua-action-btn min-w-[44px] min-h-[44px] flex items-center justify-center
```

### 3-4. UserBubble 복사 버튼 — 모바일 접근 불가
**파일:** `src/components/chat/ChatMessage.tsx:270-292`
**문제:** `opacity-0 group-hover:opacity-100`만 있어 터치 디바이스에서 안 보임
**수정:**
```
old: opacity-0 group-hover:opacity-100
new: opacity-0 group-hover:opacity-100 max-lg:opacity-60
```

### 3-5. ChatInput Send 버튼 — 터치 타겟 미달
**파일:** `src/components/chat/ChatInput.tsx:597`
**문제:** `max-lg:h-10 max-lg:w-10` (40px) → 44px 미달
**수정:**
```
old: max-lg:h-10 max-lg:w-10
new: max-lg:h-11 max-lg:w-11
```

### 3-6. ChatPlusMenu — 터치 타겟 미달
**파일:** `src/components/chat/input/ChatPlusMenu.tsx` MenuItem
**문제:** `py-2` → 높이 ~36px
**수정:**
```
old: py-2
new: py-3 max-lg:py-3.5
```

### 3-7. QuickPromptBar — 다크모드 + 스크롤 힌트
**파일:** `src/components/chat/QuickPromptBar.tsx:100-115`
**문제:** 모바일 칩에 다크모드 미지원 + 가로 스크롤 힌트 없음
**수정:** 다크모드 배경/텍스트 추가, 좌우 그라데이션 마스크 추가

---

## 4. P2: 나중 디테일 개선

| # | 파일 | 이슈 | 수정안 |
|---|------|------|--------|
| 1 | ChatMain:571 | `scrollbar-gutter: stable` 모바일 불필요 | `max-lg:scrollbar-gutter-auto` |
| 2 | ChatMain | `pb-[96px]` 고정 vs 가변 ChatInput 높이 | CSS 변수로 동적 계산 |
| 3 | globals.css | 코드블록 폰트 15.6px 모바일 고정 | 14px 권장 |
| 4 | AppSidebar | ThreadItem 더보기 버튼 36px | 44px로 |
| 5 | ChatOverview | 최근 채팅 hover 라이트모드 안 보임 | `hover:bg-gray-100 dark:hover:bg-white/10` |
| 6 | AssistantMessage | footer `border-gray-100` 다크모드 안 보임 | `dark:border-[var(--line)]` |
| 7 | globals.css | 641-767px CSS 토큰 빈 구간 | 태블릿 전용 토큰 추가 |

---

## 5. 우선순위 요약

| 우선순위 | 항목 수 | 핵심 |
|----------|---------|------|
| **P0** | 4개 | SettingsModal/ImageModal/LoginModal/BillingBanner 깨짐 |
| **P1** | 7개 | safe-area, 터치 타겟 44px, 모바일 접근성 |
| **P2** | 7개 | 다크모드 누락, 폰트 크기, 스크롤 세부 |
