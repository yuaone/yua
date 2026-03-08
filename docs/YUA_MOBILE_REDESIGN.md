# YUA Mobile Redesign — Complete Design Document

> ChatGPT / Claude 앱 스타일 네이티브 리디자인 SSOT
> 작성: 2026-03-08
> 상태: 전체 설계 완료
> 대상: yua-mobile (Expo SDK 54 + React Native 0.81.5)

---

## 목차

1. [설계 원칙](#1-설계-원칙)
2. [디자인 토큰 시스템](#2-디자인-토큰-시스템)
3. [웹 vs 모바일 기능 갭 분석](#3-웹-vs-모바일-기능-갭-분석)
4. [화면별 리디자인 상세](#4-화면별-리디자인-상세)
5. [컴포넌트 리디자인 명세](#5-컴포넌트-리디자인-명세)
6. [적응형 UI 전략](#6-적응형-ui-전략)
7. [제스처 & 애니메이션 명세](#7-제스처--애니메이션-명세)
8. [상태 관리 리디자인](#8-상태-관리-리디자인)
9. [네비게이션 구조](#9-네비게이션-구조)
10. [구현 우선순위 & 일정](#10-구현-우선순위--일정)
11. [파일 구조](#11-파일-구조)
12. [기술 스택 추가](#12-기술-스택-추가)
13. [즉시 수정 항목 (HOT FIX)](#13-즉시-수정-항목)
14. [성능 최적화 전략](#14-성능-최적화-전략)
15. [접근성 & 국제화](#15-접근성--국제화)
16. [Appendix A: 웹 기능 전체 체크리스트](#appendix-a-웹-기능-전체-체크리스트)
17. [Appendix B: 현재 모바일 파일 인벤토리](#appendix-b-현재-모바일-파일-인벤토리)

---

## 1. 설계 원칙

### 1.1 웹과의 관계
| 구분 | 웹 (SSOT) | 모바일 |
|------|-----------|--------|
| **기능 범위** | 기능 목록의 SSOT | 웹의 모든 기능을 네이티브로 구현 |
| **색상** | globals.css CSS 변수 | theme.ts 동일 값 매핑 |
| **spacing/sizing** | CSS px 기반 | 모바일 전용 토큰 (8pt grid) |
| **애니메이션** | CSS transition/ease | Reanimated spring 기반 |
| **타이포** | 본문 14px | 본문 16px (모바일 가독성) |
| **컴포넌트** | React DOM | React Native (완전 독립) |
| **공유 코드** | yua-shared 타입/계약 | yua-shared 타입/계약 (동일) |
| **레이아웃** | max-width 960px | 풀 스크린 + safe area |

### 1.2 모바일 디자인 철학

**터치 퍼스트**
- 최소 터치 타겟: 44×44px (Apple HIG)
- 주요 액션 버튼: 48×48px
- 네비게이션 바/입력바: 56px 높이
- 버튼 간 최소 간격: 8px

**제스처 네이티브**
- 사이드바: 좌측 엣지 스와이프 (20px 존)
- 스레드 삭제: 좌 스와이프
- 이미지 확대: 핀치 줌
- 메시지 액션: 롱프레스 (ActionSheet)
- 리스트 새로고침: Pull-to-refresh
- 하단 시트: 드래그 to dismiss

**스프링 애니메이션**
- 모든 전환: `withSpring` 기반 (ease/linear 금지)
- 시트/드로어: `withTiming` + cubic easing (빠른 열기, 부드러운 닫기)
- 리스트 아이템: `LayoutAnimation.configureNext` 또는 `layout={Layout}`

**햅틱 피드백**
| 액션 | 햅틱 타입 |
|------|-----------|
| 전송 버튼 탭 | `Haptics.impactAsync(Light)` |
| 스레드 삭제 | `Haptics.notificationAsync(Warning)` |
| 핀 토글 | `Haptics.impactAsync(Medium)` |
| 모드 변경 | `Haptics.selectionAsync()` |
| 롱프레스 메뉴 | `Haptics.impactAsync(Heavy)` |
| Pull-to-refresh 트리거 | `Haptics.impactAsync(Light)` |

---

## 2. 디자인 토큰 시스템

### 2.1 색상 (웹 SSOT에서 포크)

웹 `globals.css` 변수와 모바일 `theme.ts` 매핑 유지.
색상값은 브랜드 일관성을 위해 **동일하게** 유지.

현재 `theme.ts`에 70+ 토큰 정의됨 (lightColors + darkColors). 추가 토큰:

```typescript
// theme.ts에 추가
// AI 아바타
avatarBg: "#0f172a",           // 다크: "#f5f5f5"
avatarText: "#ffffff",          // 다크: "#111111"

// 퀵 프롬프트
quickPromptBg: "#f8f8f8",       // 다크: "#1e1e1e"
quickPromptBorder: "rgba(0,0,0,0.06)", // 다크: "rgba(255,255,255,0.08)"
quickPromptText: "#374151",     // 다크: "#d1d5db"

// 검색바
searchBarBg: "#f4f4f4",         // 다크: "#1e1e1e"
searchBarBorder: "rgba(0,0,0,0.08)",
searchHighlight: "#fef08a",     // 다크: "#854d0e"

// 시간 그룹 라벨
timeGroupLabel: "#9ca3af",      // 다크: "#6b7280"

// 음성
voiceWaveform: "#6366f1",       // 다크: "#818cf8"
voiceRecordBg: "#fef2f2",       // 다크: "rgba(239,68,68,0.1)"

// ActionSheet
actionSheetBg: "#ffffff",       // 다크: "#2a2a2a"
actionSheetDestructive: "#dc2626",
```

### 2.2 모바일 전용 토큰 (`constants/tokens.ts` NEW)

```typescript
import { Platform } from "react-native";

export const MobileTokens = {
  /* ============================
     Spacing (8pt grid)
     웹보다 넉넉한 여백 (터치 오차 고려)
  ============================ */
  space: {
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    xxxl: 48,
  },

  /* ============================
     Touch Targets
     Apple HIG: 44pt 최소
     Google MD3: 48dp 권장
  ============================ */
  touch: {
    min: 44,            // 최소 터치 영역
    comfortable: 48,    // 주요 버튼
    large: 56,          // TopBar, 입력바
    xl: 64,             // 풀사이즈 버튼
  },

  /* ============================
     Border Radius
     웹(4-12px)보다 둥글게 → 부드러운 네이티브 느낌
  ============================ */
  radius: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    pill: 999,
    bubble: 18,         // 유저 메시지 버블
    bubbleCorner: 4,    // 연속 버블의 안쪽 코너
    input: 24,          // 입력바 외곽
    card: 16,           // 카드형 컴포넌트
    avatar: 14,         // 아바타 (28/2)
    chip: 12,           // 칩/뱃지
    codeBlock: 12,      // 코드블록
    actionSheet: 14,    // 하단 시트
  },

  /* ============================
     Typography
     모바일은 본문 16px 기준 (웹 14px)
     iOS: SF Pro, Android: Roboto (system-ui)
  ============================ */
  font: {
    xxs: 10,            // 타임스탬프, 뱃지
    xs: 11,             // 캡션, 힌트
    sm: 13,             // 보조 텍스트, 라벨
    md: 15,             // 소제목, 버튼
    body: 16,           // 본문 기본
    lg: 18,             // 섹션 제목
    xl: 22,             // 페이지 제목
    xxl: 28,            // 히어로 텍스트
    title: 34,          // 대형 타이틀 (Intro, Overview)
  },

  /* ============================
     Font Weight
  ============================ */
  weight: {
    regular: "400" as const,
    medium: "500" as const,
    semibold: "600" as const,
    bold: "700" as const,
  },

  /* ============================
     Line Height (multiplier)
  ============================ */
  lineHeight: {
    tight: 1.2,         // 제목, 버튼
    normal: 1.5,        // 본문
    relaxed: 1.7,       // 긴 텍스트 (마크다운)
    code: 1.4,          // 코드블록
  },

  /* ============================
     Shadows (Platform-specific)
     iOS: shadow* 프로퍼티
     Android: elevation
  ============================ */
  shadow: {
    none: Platform.select({
      ios: { shadowOpacity: 0 },
      android: { elevation: 0 },
    }),
    sm: Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
      },
      android: { elevation: 2 },
    }),
    md: Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.10,
        shadowRadius: 6,
      },
      android: { elevation: 4 },
    }),
    lg: Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.14,
        shadowRadius: 12,
      },
      android: { elevation: 8 },
    }),
    input: Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: { elevation: 3 },
    }),
  },

  /* ============================
     Animation (Reanimated)
  ============================ */
  spring: {
    gentle: { damping: 20, stiffness: 150, mass: 1 },
    snappy: { damping: 15, stiffness: 300, mass: 0.8 },
    bouncy: { damping: 10, stiffness: 200, mass: 1 },
    sheet: { damping: 25, stiffness: 400, mass: 0.9 },   // 하단 시트
    sidebar: { damping: 22, stiffness: 250, mass: 1 },   // 사이드바
  },

  timing: {
    fast: 150,          // 버튼 프레스, 토글
    normal: 250,        // 패널 열기/닫기
    slow: 400,          // 페이지 전환
    sheet: { open: 300, close: 220 },
    sidebar: { open: 300, close: 250 },
  },

  /* ============================
     Breakpoints (적응형)
  ============================ */
  breakpoint: {
    smallPhone: 375,    // iPhone SE, Galaxy S 소형
    phone: 390,         // iPhone 15 등
    largePhone: 428,    // iPhone 15 Pro Max
    tablet: 768,        // iPad mini+
    largeTablet: 1024,  // iPad Pro 11"+
  },

  /* ============================
     Layout Constants
  ============================ */
  layout: {
    topBarHeight: 56,
    inputBarMinHeight: 52,
    inputBarMaxHeight: 200,
    sidebarWidth: 320,              // 태블릿 고정
    sidebarOverlayPercent: 0.8,     // 폰 오버레이
    sidebarEdgeZone: 20,            // 스와이프 존
    messageGap: 24,                 // 메시지 간격
    messagePadPhone: 14,
    messagePadTablet: 24,
    avatarSize: 28,
    scrollButtonSize: 40,
    actionButtonSize: 32,
    chipHeight: 28,
    searchBarHeight: 44,
  },
};
```

### 2.3 적응형 유틸리티 (`constants/adaptive.ts` NEW)

```typescript
import { Dimensions, PixelRatio } from "react-native";
import { MobileTokens } from "./tokens";

const { width, height } = Dimensions.get("window");
const bp = MobileTokens.breakpoint;

export function getDeviceClass() {
  if (width >= bp.largeTablet) return "largeTablet";
  if (width >= bp.tablet) return "tablet";
  if (width >= bp.largePhone) return "largePhone";
  if (width >= bp.phone) return "phone";
  return "smallPhone";
}

export function isTablet() {
  return width >= bp.tablet;
}

export function isLargePhone() {
  return width >= bp.largePhone && width < bp.tablet;
}

export function adaptive<T>(values: {
  phone: T;
  largePhone?: T;
  tablet?: T;
}): T {
  if (width >= bp.tablet && values.tablet !== undefined) return values.tablet;
  if (width >= bp.largePhone && values.largePhone !== undefined) return values.largePhone;
  return values.phone;
}

// 메시지 영역 패딩
export const messagePadX = adaptive({ phone: 14, largePhone: 16, tablet: 24 });
// 입력바 수평 패딩
export const inputPadX = adaptive({ phone: 12, largePhone: 16, tablet: 20 });
// 유저 버블 최대 너비 비율
export const userBubbleMaxWidth = adaptive({ phone: 0.85, largePhone: 0.80, tablet: 0.70 });
// 코드블록 폰트 크기
export const codeBlockFontSize = adaptive({ phone: 12, largePhone: 13, tablet: 14 });
// 이미지 그리드 열 수
export const imageGridColumns = adaptive({ phone: 1, largePhone: 2, tablet: 3 });
```

---

## 3. 웹 vs 모바일 기능 갭 분석

### 3.1 채팅 기능 (31항목)

| # | 기능 | 웹 | 모바일 | 갭 | Phase |
|---|------|:--:|:------:|:--:|:-----:|
| 1 | 메시지 목록 + 자동스크롤 | O | O | - | - |
| 2 | 유저 버블 + 어시스턴트 flat | O | △ | 리디자인 | P1 |
| 3 | AI 아바타 (좌측) | O | X | **NEW** | P1 |
| 4 | 마크다운 렌더링 | O | O | - | - |
| 5 | 코드블록 + Prism 구문강조 | O | △ | 강화 | P2 |
| 6 | KaTeX 수학 렌더링 | O | X | **NEW** | P3 |
| 7 | Mermaid 다이어그램 | O | X | **NEW** | P3 |
| 8 | 스트리밍 타이핑 | O | O | - | - |
| 9 | Thinking 패널 (접기/펼치기) | O | △ | 리디자인 | P1 |
| 10 | DeepThinking 드로어 | O | △ | 리디자인 | P1 |
| 11 | 도구 실행 코드블록 | O | O | - | - |
| 12 | Quant 분석 블록 | O | X | **NEW** | P3 |
| 13 | 메시지 액션 (SVG 아이콘) | O | △ (이모지) | SVG 교체 | P1 |
| 14 | 메시지 공유 링크 | O | X | **NEW** | P2 |
| 15 | 메시지 검색 (ChatSearchBar) | O | X | **NEW** | P2 |
| 16 | 퀵 프롬프트 바 | O | X | **NEW** | P1 |
| 17 | 제안 블록 (SuggestionBlock) | O | O | - | - |
| 18 | 이모지 컨텍스트 라인 | O | O | - | - |
| 19 | 비교 테이블 렌더링 | O | O | - | - |
| 20 | 이미지 섹션 블록 | O | O | - | - |
| 21 | 이미지 에디터 (크롭/회전) | O | X | **NEW** | P4 |
| 22 | 첨부파일 프리뷰 | O | O | - | - |
| 23 | 파일 패널 (스프레드시트) | O | X | **NEW** | P3 |
| 24 | CSV UTF-8→CP949 한국어 | O | X | **NEW** | P3 |
| 25 | 오디오 버블 (음성 재생) | O | X | **NEW** | P2 |
| 26 | 음성 녹음 바 (파형) | O | X | **NEW** | P2 |
| 27 | 음성 버튼 (권한 체크) | O | X | **NEW** | P2 |
| 28 | 드래프트 저장/복원 | O | X | **NEW** | P2 |
| 29 | Pull-to-refresh | O | X | **NEW** | P1 |
| 30 | 사용량 가드 (일일 제한) | O | X | **NEW** | P2 |
| 31 | 4000줄 제한 + IME 처리 | O | X | **NEW** | P2 |

### 3.2 사이드바/네비게이션 (14항목)

| # | 기능 | 웹 | 모바일 | 갭 | Phase |
|---|------|:--:|:------:|:--:|:-----:|
| 1 | 스레드 목록 | O | O | - | - |
| 2 | 시간별 그룹핑 (오늘/어제/지난주) | O | X | **NEW** | P1 |
| 3 | 핀 고정 | O | O | - | - |
| 4 | 스레드 이름변경 | O | O | - | - |
| 5 | 스레드 삭제 | O | O | - | - |
| 6 | 스레드 범프 (상단 이동) | O | X | **NEW** | P2 |
| 7 | 프로젝트로 이동 (모달) | O | X | **NEW** | P2 |
| 8 | 컨텍스트 메뉴 | O (우클릭) | △ (Alert) | ActionSheet | P1 |
| 9 | 프로젝트 폴더 접기 | O | △ | 애니메이션 | P1 |
| 10 | 프로젝트 생성 (플랜 제한) | O | X | **NEW** | P2 |
| 11 | 새 채팅 (eager thread) | O | O | - | - |
| 12 | 프로필 패널 (슬라이드) | O | X | **NEW** | P1 |
| 13 | 워크스페이스 전환 | O | △ (UI만) | API 연동 | P2 |
| 14 | 사이드바 내 검색 | X | X | 양쪽 미구현 | P3 |

### 3.3 설정/빌링/인증 (17항목)

| # | 기능 | 웹 | 모바일 | 갭 | Phase |
|---|------|:--:|:------:|:--:|:-----:|
| 1 | 설정 (7탭 풀스크린) | O (모달) | △ (기본) | 전체 재구현 | P2 |
| 2 | 개인화 (이름/테마/톤) | O | △ (이름만) | 확장 | P2 |
| 3 | 테마 선택 (Light/Dark/System) | O | △ (자동만) | 수동 선택 | P1 |
| 4 | 알림 설정 | O | X | **NEW** | P3 |
| 5 | 데이터 제어 | O | X | **NEW** | P4 |
| 6 | 보안 설정 | O (placeholder) | X | P4 | P4 |
| 7 | 빌링 대시보드 | O (672줄) | X | **NEW** | P2 |
| 8 | 메모리 관리 패널 | O (630줄) | X | **NEW** | P3 |
| 9 | 워크스페이스 관리 (9섹션) | O | X | **NEW** | P3 |
| 10 | Google OAuth | O | △ (Dev Build) | - | - |
| 11 | 이메일 로그인 | O | O | - | - |
| 12 | 게스트 모드 | O | X | **NEW** | P2 |
| 13 | 온보딩 | O | O | - | - |
| 14 | 서포트 티켓 | O | X | **NEW** | P3 |
| 15 | 업그레이드 페이지 | O | X | **NEW** | P2 |
| 16 | 스마트 업그레이드 모달 | O | X | **NEW** | P2 |
| 17 | 결제수단 변경 모달 | O | X | **NEW** | P3 |

### 3.4 기타 (6항목)

| # | 기능 | 웹 | 모바일 | Phase |
|---|------|:--:|:------:|:-----:|
| 1 | 스튜디오 (이미지/문서/비디오) | O | X | P4 |
| 2 | 가이드 페이지 | O | X | P4 |
| 3 | 정책 페이지 | O | △ (웹 링크) | - |
| 4 | 공유 링크 뷰 | O | X | P3 |
| 5 | 워크스페이스 초대 참여 | O | X | P3 |
| 6 | Deep link 처리 | X | X | P3 |

### 3.5 갭 요약

| Phase | 미구현 | 리디자인 | 합계 |
|-------|--------|----------|------|
| P1 | 8 | 7 | **15** |
| P2 | 16 | 0 | **16** |
| P3 | 12 | 0 | **12** |
| P4 | 6 | 0 | **6** |
| **합계** | **42** | **7** | **49** |

---

## 4. 화면별 리디자인 상세

### 4.1 ChatOverview (새 채팅 랜딩)

#### 현재 문제
- `recent.length > 0` 조건 렌더링 → 비동기 로드 시 입력창 위→아래 점프
- ScrollView 안에 입력창 → 레이아웃 불안정
- 퀵 프롬프트 없음

#### 리디자인 레이아웃

```
┌──────────────────────────────────┐
│ [☰]         YUA          [⚙]   │ ← TopBar 56px
├──────────────────────────────────┤
│                                  │
│         (flex spacer)            │
│                                  │
│        ╭─────────────╮           │
│        │    Y U A    │           │ ← 로고 (48px, 둥근 원)
│        ╰─────────────╯           │
│                                  │
│    안녕하세요! 무엇을 도와드릴까요?  │ ← 인사말 (22px semibold)
│                                  │
│  ┌─────┐ ┌─────┐ ┌─────┐       │ ← QuickPromptBar
│  │ 📝  │ │ 💡  │ │ 🔍  │       │   수평 스크롤
│  │추천  │ │설명 │ │비교 │       │
│  └─────┘ └─────┘ └─────┘       │
│                                  │
│         (flex spacer)            │
│                                  │
├──────────────────────────────────┤
│ ┌────────────────────────────┐   │ ← 플로팅 입력바
│ │ [+]  메시지를 입력...  [🎤]│   │   하단 고정
│ └────────────────────────────┘   │
│         (safe area bottom)       │
└──────────────────────────────────┘
```

#### 핵심 변경
1. **최근 스레드 목록 완전 제거** → 사이드바에서만 접근
2. **입력창 하단 절대 고정** → `position: "absolute", bottom: safeBottom`
3. **QuickPromptBar 추가** → 6개 칩, 수평 스크롤
4. **KeyboardAvoidingView** → 키보드 올라올 때 입력바 자연스럽게 이동
5. **flex spacer** → 로고+인사말이 항상 중앙 정렬

#### QuickPromptBar 칩 데이터 (웹 SSOT)
```typescript
const QUICK_PROMPTS = [
  { emoji: "📝", title: "추천", desc: "맞춤 추천을 받아보세요" },
  { emoji: "💡", title: "설명", desc: "복잡한 개념을 쉽게" },
  { emoji: "📋", title: "정리", desc: "정보를 깔끔하게 정리" },
  { emoji: "🔍", title: "비교", desc: "옵션을 비교 분석" },
  { emoji: "🛠", title: "어떻게", desc: "방법과 단계를 안내" },
  { emoji: "✨", title: "아이디어", desc: "창의적 아이디어 제안" },
];
```

#### 칩 스타일
```
크기: 120 × 72px (고정)
배경: quickPromptBg
테두리: 1px quickPromptBorder
radius: 16px
이모지: 20px (상단)
타이틀: 13px semibold
수평 간격: 8px
스크롤: horizontal, showsHorizontalScrollIndicator=false
좌측 패딩: messagePadX (첫 칩)
```

---

### 4.2 채팅 화면 (MobileChatScreen)

#### 리디자인 레이아웃

```
┌──────────────────────────────────┐
│ [☰]    React 19 정리     [🧠]  │ ← TopBar 56px
├──────────────────────────────────┤
│                                  │
│ [Y] YUA                         │ ← AI 아바타 28px + 이름
│     안녕하세요! React 19의       │    flat 텍스트 (버블 없음)
│     주요 변경사항을 정리해        │
│     드리겠습니다.                │
│                                  │
│     **1. Actions**               │    마크다운 렌더링
│     React 19에서 가장...         │
│                                  │
│     ```tsx                       │    코드블록
│     function Component() {       │
│       ...                        │
│     }                            │
│     ```                          │
│                                  │
│     [👍] [👎] [📋] [🔄] [🔗]   │ ← 메시지 액션 (SVG)
│                                  │
│ ─────────── 24px gap ──────────  │
│                                  │
│              ┌────────────────┐  │ ← 유저 버블 (우측정렬)
│              │ 코드 예제 포함  │  │    배경: userBubbleBg
│              │ 해서 정리해줘   │  │    radius: 18px
│              └────────────────┘  │
│                                  │
│ ─── 🔵 Thinking... (3s) [▾] ──  │ ← Thinking 접기/펼치기
│                                  │
│ [Y] YUA                         │
│     네, 코드 예제를 포함하여...   │    스트리밍 중
│     █                            │    커서 블링크
│                                  │
├──────────────────────────────────┤
│ ┌────────────────────────────┐   │ ← 플로팅 입력바
│ │ [+]  메시지를 입력...  [🎤]│   │
│ └────────────────────────────┘   │
│         (safe area bottom)       │
└──────────────────────────────────┘
```

#### TopBar 상세
```
높이: 56px
배경: topBarBg
좌측: [☰ 메뉴] 44×44 터치영역, 아이콘 20px
중앙: 스레드 제목 (15px medium, 한 줄, ellipsis)
우측: [🧠 Thinking] 44×44 — 탭 시 Thinking 드로어 토글
       DEEP 모드일 때 아이콘에 보라색 dot 표시
```

---

### 4.3 사이드바

#### 리디자인 레이아웃

```
┌──────────────────────────┐
│ ╭──╮                     │
│ │YUA│  [+ 새 채팅]       │ ← 고정 헤더 (56px)
│ ╰──╯                     │
├──────────────────────────┤
│                          │ ← 스크롤 영역
│ 📌 고정됨                 │ ← 핀 그룹 (있을 때만)
│ ┌────────────────────┐   │
│ │ API 설계 가이드  📌 │   │   스와이프 to unpin
│ └────────────────────┘   │
│                          │
│ 오늘                      │ ← 시간 그룹 라벨 (11px, 대문자)
│ ┌────────────────────┐   │
│ │ React 19 정리       │   │   48px 높이
│ │ 2시간 전            │   │   제목 15px + 시간 11px
│ └────────────────────┘   │
│ ┌────────────────────┐   │
│ │ 코드리뷰 요청       │   │   활성: 좌측 2px 보라 바
│ │ 5시간 전            │   │          + activeItem bg
│ └────────────────────┘   │
│                          │
│ 어제                      │ ← 다음 그룹
│ ┌────────────────────┐   │
│ │ 주간 보고서 작성     │   │
│ │ 어제                 │   │
│ └────────────────────┘   │
│                          │
│ 지난 주                   │
│ ...                      │
│                          │
│ ─── 📁 프로젝트 ─── [▾]  │ ← 접기/펼치기 섹션
│ ┌────────────────────┐   │
│ │ 📁 YUA 개발    (3) │   │   스레드 카운트 뱃지
│ │ 📁 블로그       (1) │   │
│ └────────────────────┘   │
│ [+ 새 프로젝트]           │   플랜 제한 체크
│                          │
├──────────────────────────┤
│ ┌────────────────────┐   │ ← 고정 푸터
│ │ 👤 사용자이름       │   │   프로필 패널 트리거
│ │    Free Plan        │   │   롱프레스: 로그아웃
│ └────────────────────┘   │
│ [⚙ 설정]                 │   설정 스크린으로 이동
└──────────────────────────┘
```

#### 시간 그룹핑 로직 (웹 ThreadGroup.tsx 포팅)
```typescript
function groupThreadsByTime(threads: Thread[]): ThreadGroup[] {
  const now = Date.now();
  const todayStart = startOfDay(now);
  const yesterdayStart = startOfDay(now - 86400000);
  const lastWeekStart = startOfDay(now - 7 * 86400000);

  const groups: ThreadGroup[] = [];
  const pinned = threads.filter(t => t.pinned);
  const unpinned = threads.filter(t => !t.pinned);

  if (pinned.length > 0) {
    groups.push({ label: "고정됨", threads: pinned });
  }

  const today = unpinned.filter(t => t.lastActiveAt >= todayStart);
  const yesterday = unpinned.filter(t =>
    t.lastActiveAt >= yesterdayStart && t.lastActiveAt < todayStart
  );
  const lastWeek = unpinned.filter(t =>
    t.lastActiveAt >= lastWeekStart && t.lastActiveAt < yesterdayStart
  );
  const older = unpinned.filter(t => t.lastActiveAt < lastWeekStart);

  if (today.length) groups.push({ label: "오늘", threads: today });
  if (yesterday.length) groups.push({ label: "어제", threads: yesterday });
  if (lastWeek.length) groups.push({ label: "지난 주", threads: lastWeek });
  if (older.length) groups.push({ label: "이전", threads: older });

  return groups;
}
```

#### 스레드 아이템 스와이프 액션
```
← 좌 스와이프:
  [📌 핀] [🗑 삭제]      (빨간 배경)

롱프레스 → ActionSheet:
  - 이름 변경
  - 핀 고정 / 해제
  - 상단으로 이동 (범프)
  - 프로젝트로 이동...  → 서브메뉴
  - 삭제                → 확인 Alert
  - 취소
```

---

### 4.4 설정 화면

#### 네이티브 스택 네비게이션 (모달 → 풀스크린)

```
[설정 메인] → [개인화] → [테마 선택]
           → [빌링]   → [플랜 변경]
           → [메모리]  → [메모리 편집]
           → [알림]
           → [워크스페이스]
           → [데이터]
```

#### 설정 메인 화면
```
┌──────────────────────────────────┐
│ [←]           설정               │ ← 헤더
├──────────────────────────────────┤
│                                  │
│  ╭────╮                          │
│  │ JW │  정원님                   │ ← 프로필 카드
│  ╰────╯  jw@example.com          │    60px 아바타
│           Free Plan               │    이름 18px bold
│                                  │    이메일 13px muted
├──────────────────────────────────┤
│                                  │
│  🎨  개인 맞춤 설정           >  │ ← 설정 행
│  ─────────────────────────────  │    48px 높이
│  🔔  알림                     >  │    아이콘 20px + 라벨 15px
│  ─────────────────────────────  │
│  💳  빌링                     >  │
│  ─────────────────────────────  │
│  🧠  메모리                   >  │
│  ─────────────────────────────  │
│  👥  워크스페이스               >  │
│  ─────────────────────────────  │
│  🗄  데이터 제어               >  │
│                                  │
├──────────────────────────────────┤
│                                  │
│  📄  개인정보처리방침           >  │ ← 외부 링크
│  ─────────────────────────────  │
│  📄  이용약관                  >  │
│                                  │
│       앱 버전 1.0.0              │ ← 13px muted, 중앙
│                                  │
├──────────────────────────────────┤
│                                  │
│  🚪  로그아웃                    │ ← 빨간색, 중앙 정렬
│                                  │
└──────────────────────────────────┘
```

#### 개인화 서브 화면
```
[←] 개인 맞춤 설정
──────────────────────
표시 이름
┌──────────────────┐
│ 정원               │  ← TextInput, 자동저장 600ms
└──────────────────┘

테마
  ○ 라이트    ◉ 다크    ○ 시스템
  (3열 라디오, 프리뷰 카드)

말투
  ☑ 이름 부르기 허용
  ☑ 개인화된 톤 허용
```

#### 빌링 서브 화면 (웹 BillingPanel.tsx 포팅)
```
[←] 빌링
──────────────────────
현재 플랜
┌──────────────────────────┐
│  FREE                     │
│  무료 체험 중              │
│  일일 메시지: 15/20        │  ← 프로그레스 바
│                            │
│  [Pro로 업그레이드]         │  ← CTA 버튼
└──────────────────────────┘

사용량
┌──────────────────────────┐
│  이번 달 토큰              │
│  ████████░░  12,450       │  ← 프로그레스 바
│  / 50,000 (24.9%)          │
└──────────────────────────┘

결제 내역
  2026-03-01  Pro 월간    ₩19,900
  2026-02-01  Pro 월간    ₩19,900
  ...
```

---

## 5. 컴포넌트 리디자인 명세

### 5.1 ChatInput (입력바)

#### Props
```typescript
interface ChatInputProps {
  streaming: boolean;
  disabled: boolean;
  onSend: (text: string, attachments: PendingAttachment[]) => void;
  onStop?: () => void;
  onAttachPress?: () => void;
  thinkingProfile?: ThinkingProfile | null;
  onDismissThinking?: () => void;
  draft?: string;
  onDraftChange?: (text: string) => void;
}
```

#### 상태별 렌더링

**Idle (빈 입력)**
```
┌──────────────────────────────────────┐
│ [+]   메시지를 입력하세요...    [🎤] │
└──────────────────────────────────────┘
```
- `+` 버튼: 32×32, 좌측 12px margin
- placeholder: 15px, inputPlaceholder 색상
- 마이크 버튼: 32×32, 우측 12px margin
- 전체 높이: 52px
- 배경: inputShellBg
- 테두리: 1px inputShellBorder
- radius: 24px
- shadow: MobileTokens.shadow.input

**Typing (텍스트 입력 중)**
```
┌──────────────────────────────────────┐
│ [+]   텍스트 내용...           [➤]  │
└──────────────────────────────────────┘
```
- 마이크 → 전송 버튼 (fade 전환, 150ms)
- 전송 버튼: 32×32, 배경 buttonBg, 원형, 화살표 아이콘 16px 흰색
- 높이: auto-grow (최대 200px)
- 테두리: inputShellFocusBorder

**Streaming (스트리밍 중)**
```
┌──────────────────────────────────────┐
│ [+]   (입력 비활성)            [■]  │
└──────────────────────────────────────┘
```
- 전송 → 정지 버튼 (32×32, 빨간 사각형 8×8)
- TextInput: editable=false, opacity 0.5

**With Attachments**
```
┌──────────────────────────────────────┐
│ [DEEP ×]                             │ ← 칩 영역 (선택적)
├──────────────────────────────────────┤
│ [📷 img1] [📄 file.csv] [×]         │ ← 첨부 수평 스크롤
├──────────────────────────────────────┤
│ [+]   텍스트...                      │
│                                [➤]   │ ← 우하단 정렬
└──────────────────────────────────────┘
```

**With DEEP Mode Chip**
```
┌──────────────────────────────────────┐
│ ┌────────┐                           │
│ │DEEP  × │                           │ ← 칩: 28px 높이
│ └────────┘                           │    bg: thinkDeepChipBg
├──────────────────────────────────────┤    color: thinkDeepChipColor
│ [+]   텍스트...                [➤]  │    radius: 8px
└──────────────────────────────────────┘    × 탭: dismiss
```

#### 4000줄 제한 (웹 포팅)
```typescript
const LINE_LIMIT = 4000;
const WARNING_THRESHOLD = 3800;

// charCodeAt 기반 줄 수 카운트 (가장 빠른 방식)
function countLines(text: string): number {
  let count = 1;
  for (let i = 0; i < text.length; i++) {
    if (text.charCodeAt(i) === 10) count++;
  }
  return count;
}

// 경고 표시: lineCount >= WARNING_THRESHOLD
// 입력 차단: lineCount >= LINE_LIMIT
```

#### IME 처리 (한국어/일본어/중국어)
```typescript
const composingRef = useRef(false);

// TextInput에는 onCompositionStart/End가 없으므로
// onKeyPress + debounce 조합 사용
// debounce 중 조합 중이면 skip
```

#### 드래프트 저장 (AsyncStorage)
```typescript
// 키: `draft:${threadId || "overview"}`
// 저장: 300ms debounce
// 복원: 화면 진입 시
// 삭제: 전송 성공 시
```

---

### 5.2 AssistantMessage (AI 응답)

#### 구조
```
┌──────────────────────────────────────┐
│ ╭──╮                                 │
│ │ Y│  YUA                            │ ← 아바타 + 이름
│ ╰──╯                                 │
│                                      │
│ 응답 텍스트가 여기에 렌더링됩니다.     │ ← flat (버블 없음)
│ 전체 너비 사용, 좌측 정렬              │
│                                      │
│ ```code block```                     │ ← 마크다운 콘텐츠
│                                      │
│ 🔵 이미지 분석 중                     │ ← 이모지 컨텍스트
│                                      │
│ [👍] [👎] [📋] [🔄] [🔗]            │ ← 액션 (finalized only)
│                                      │
│ ┌─ 관련 질문 ─────────────────────┐  │ ← 제안 블록
│ │ • React 19 마이그레이션 가이드   │  │
│ │ • Server Components 비교        │  │
│ └─────────────────────────────────┘  │
└──────────────────────────────────────┘
```

#### 아바타 스펙
```
크기: 28 × 28px
배경: avatarBg (#0f172a / 다크: #f5f5f5)
radius: 14px (원형)
텍스트: "Y" (13px bold, avatarText)
위치: 좌측 상단, 메시지 본문과 8px gap
이름: "YUA" (13px semibold, textSecondary)
```

#### 스트리밍 상태
```typescript
// 스트리밍 중일 때:
// 1. 마크다운 렌더링 (토큰 단위 업데이트)
// 2. 마지막 줄에 커서 블링크 ("█", opacity pulse 0↔1, 500ms)
// 3. 액션 버튼 숨김

// Finalized:
// 1. content 고정 (더 이상 업데이트 없음)
// 2. 액션 버튼 표시 (fade-in 200ms)
// 3. 제안 블록 표시 (있을 때)
```

---

### 5.3 MessageActions (메시지 액션)

#### 현재 → 리디자인
```
현재: 👍 👎 ⧉ ↻  (이모지, 플랫폼별 차이)
리디자인: [ThumbUp] [ThumbDown] [Copy] [Regenerate] [Share]  (SVG 아이콘)
```

#### 아이콘 스펙
```
크기: 32 × 32px 터치 영역 (아이콘 자체 16px)
간격: 4px
정렬: 좌측
색상: textMuted (idle), statusOk green (active)
Copy 상태: 탭 → checkmark 1.2s → 복귀
Feedback: 탭 → 색상 변경 (green up / red down)
Share: expo-sharing 또는 Clipboard + toast
```

#### SVG 아이콘 소스 (Lucide RN)
```typescript
import { ThumbsUp, ThumbsDown, Copy, Check, RefreshCw, Share2 } from "lucide-react-native";
// 또는 react-native-svg 직접 Path
```

---

### 5.4 ThinkingCollapsible (접기/펼치기 — NEW)

#### Props
```typescript
interface ThinkingCollapsibleProps {
  chunks: MobileOverlayChunk[];
  summaries: MobileThinkingSummary[];
  profile: ThinkingProfile;
  elapsed: number;           // ms
  finalized: boolean;
  hasText: boolean;          // 응답 텍스트 도착 여부
  onToggle?: () => void;
}
```

#### 접힌 상태 (기본)
```
┌──────────────────────────────────────┐
│ 🔵 Thinking... (12s)      [▾ 펼치기]│
└──────────────────────────────────────┘

크기: 전체 너비, 40px 높이
배경: thinkPanelBg
테두리: 1px thinkPanelBorder
radius: 12px
🔵: PulseDot (8px, 800ms opacity pulse)
"Thinking...": 13px semibold, thinkPanelLabel
시간: 11px, textMuted
토글: 11px, linkColor
```

#### 펼친 상태
```
┌──────────────────────────────────────┐
│ 🔵 Deep Thinking (12s)    [▴ 접기]  │
├──────────────────────────────────────┤
│ ● 입력 분석 중              ✅ 0.8s  │ ← 타임라인
│ ● 계획 수립 중              ✅ 1.2s  │
│ ● 검색 중                   🔵 ...   │ ← running
│   "React 19 변경사항"                │    검색 쿼리
│   ┌ react.dev ┐ ┌ github.com ┐     │    소스 칩
│   └───────────┘ └────────────┘     │
│ ● 도구 실행                  ✅ 2.1s  │
│   ┌─ [search_web] ──────────────┐  │    도구 뱃지
│   │ {"query": "React 19..."}    │  │    JSON 코드블록
│   └─────────────────────────────┘  │
│                                     │
│ ✅ 생각 완료                         │ ← finalized footer
└──────────────────────────────────────┘

최대 높이: 60vh (스크롤 가능)
애니메이션: Reanimated layout transition (300ms spring)
각 청크: ThinkingChunkCard 재사용
```

#### 가시성 규칙
```
NORMAL/FAST 모드:
  - 텍스트 도착 전: 접힌 상태 표시
  - 텍스트 도착 후: 자동 숨김 (fade out 200ms)
  - 탭 시: 항상 토글 가능

DEEP 모드:
  - 항상 표시 (finalized 후에도)
  - 기본 접힌 상태
  - 탭으로 펼치기/접기
```

---

### 5.5 VoiceRecordingBar (음성 녹음 — NEW)

#### 레이아웃
```
┌──────────────────────────────────────┐
│ [×]  00:12  ∿∿∿∿∿∿∿∿∿∿∿∿∿∿∿  [✓]  │
└──────────────────────────────────────┘

높이: 52px (입력바 대체)
[×]: 취소 버튼 (32px, 빨간)
00:12: 경과 시간 (15px monospace)
파형: 40개 dot, 중앙 높이 가중 (웹과 동일)
[✓]: 확인 버튼 (32px, 녹색)
배경: voiceRecordBg
```

#### 파형 애니메이션
```typescript
// 40개 dot, 중앙이 높고 양쪽이 낮음
// 녹음 중: analyser.getByteFrequencyData → dot 높이 매핑
// dot 크기: width 3px, height 4~24px, gap 2px
// 색상: voiceWaveform
```

---

### 5.6 AudioBubble (오디오 재생 — NEW)

#### 레이아웃
```
┌──────────────────────────┐
│                          │
│    ┌────────────────┐    │
│    │  ▶ / ❚❚       │    │   160 × 160px (폰)
│    │                │    │   200 × 200px (태블릿)
│    │  |||||||||||   │    │   32개 waveform bars
│    │                │    │   보라색 테마
│    │  0:12 / 0:45   │    │
│    └────────────────┘    │
│                          │
└──────────────────────────┘

배경: voiceWaveform (투명도 0.1)
Play/Pause: 48px 중앙
Bars: 32개, seed 기반 결정적 높이
시간: 현재 / 전체 (11px monospace)
```

---

### 5.7 ChatSearchBar (메시지 검색 — NEW)

#### 레이아웃
```
┌──────────────────────────────────────┐
│ [🔍]  검색어 입력...   N/M  [▲][▼] │
└──────────────────────────────────────┘

위치: TopBar 바로 아래 (sticky)
높이: 44px
배경: searchBarBg
검색 아이콘: 16px, textMuted
입력: 15px, flex-1
N/M: 현재 / 전체 매치 (11px)
[▲][▼]: 이전/다음 매치 (32×32 터치)
[×]: 검색 닫기 (우측 끝)
```

#### 검색 로직
```typescript
// 1. 입력 debounce 300ms
// 2. messagesByThread 전체 순회, content.includes(query)
// 3. matchIndexes: number[] 구성
// 4. 현재 매치 인덱스 → scrollToIndex
// 5. 2초간 하이라이트 (searchHighlight bg)
```

---

## 6. 적응형 UI 전략

### 6.1 브레이크포인트 상세

| 클래스 | 너비 | 대표 기기 | 레이아웃 |
|--------|------|-----------|----------|
| smallPhone | < 375px | iPhone SE, Galaxy A | 컴팩트 |
| phone | 375-389px | iPhone 15, Pixel | 기본 |
| largePhone | 390-767px | iPhone Pro Max, Galaxy Ultra | 넉넉 |
| tablet | 768-1023px | iPad mini, Galaxy Tab S | 사이드바 고정 |
| largeTablet | 1024px+ | iPad Pro 11"+ | 데스크탑 유사 |

### 6.2 요소별 적응 규칙

| 요소 | smallPhone | phone | largePhone | tablet |
|------|------------|-------|------------|--------|
| **사이드바** | 오버레이 85% | 오버레이 80% | 오버레이 70% | 고정 320px |
| **메시지 좌우패딩** | 10px | 14px | 16px | 24px |
| **입력바 좌우패딩** | 10px | 12px | 16px | 20px |
| **유저 버블 max** | 88% | 85% | 80% | 70% |
| **AI 아바타** | 24px | 28px | 28px | 32px |
| **코드블록 폰트** | 11px | 12px | 13px | 14px |
| **Thinking 펼침** | 인라인 | 인라인 | 인라인 | 우측 패널 |
| **QuickPrompt** | 100×64 스크롤 | 120×72 스크롤 | 120×72 스크롤 | 2열 그리드 |
| **이미지 그리드** | 1열 | 2열 | 2열 | 3열 |
| **메시지 간격** | 16px | 20px | 24px | 28px |
| **TopBar 높이** | 48px | 56px | 56px | 56px |
| **입력바 min높이** | 48px | 52px | 52px | 52px |

### 6.3 태블릿 레이아웃

```
┌──────────┬────────────────────────────────┬──────────────┐
│ 사이드바  │         채팅 영역               │  Thinking    │
│ (320px)  │                                 │  패널        │
│          │                                 │  (320px)     │
│ 고정     │   [메시지 목록]                  │  (선택적)    │
│ 항상 표시 │                                 │              │
│          │                                 │              │
│          │   [입력바]                       │              │
└──────────┴────────────────────────────────┴──────────────┘

사이드바: 항상 표시, 스와이프 불필요
Thinking: DEEP 모드 + 펼침 시 우측 패널 (320px)
채팅: flex-1 (중앙)
```

### 6.4 useAdaptive Hook

```typescript
import { useWindowDimensions } from "react-native";
import { MobileTokens } from "@/constants/tokens";

export function useAdaptive() {
  const { width, height } = useWindowDimensions();
  const bp = MobileTokens.breakpoint;

  const deviceClass =
    width >= bp.largeTablet ? "largeTablet" :
    width >= bp.tablet ? "tablet" :
    width >= bp.largePhone ? "largePhone" :
    width >= bp.phone ? "phone" : "smallPhone";

  const isTablet = width >= bp.tablet;
  const isLargePhone = width >= bp.largePhone && !isTablet;

  function pick<T>(values: { phone: T; largePhone?: T; tablet?: T }): T {
    if (isTablet && values.tablet !== undefined) return values.tablet;
    if (isLargePhone && values.largePhone !== undefined) return values.largePhone;
    return values.phone;
  }

  return {
    width, height, deviceClass, isTablet, isLargePhone, pick,
    messagePad: pick({ phone: 14, largePhone: 16, tablet: 24 }),
    inputPad: pick({ phone: 12, largePhone: 16, tablet: 20 }),
    messageGap: pick({ phone: 20, largePhone: 24, tablet: 28 }),
    userBubbleMax: pick({ phone: 0.85, tablet: 0.70 }),
    sidebarFixed: isTablet,
    sidebarWidth: isTablet ? 320 : width * 0.8,
  };
}
```

---

## 7. 제스처 & 애니메이션 명세

### 7.1 사이드바 드로어

```typescript
// 열기: 좌측 엣지 20px 존에서 우측 스와이프
// 닫기: 사이드바 위에서 좌측 스와이프 또는 backdrop 탭
// 속도 감지: velocity > 500px/s → 즉시 열기/닫기
// 거리 감지: translationX > 60px → 열기

// Reanimated
const progress = useSharedValue(0); // 0=닫힘, 1=열림
const sidebarStyle = useAnimatedStyle(() => ({
  transform: [{ translateX: interpolate(progress.value, [0, 1], [-SIDEBAR_W, 0]) }],
}));
const backdropStyle = useAnimatedStyle(() => ({
  opacity: progress.value * 0.4,
  pointerEvents: progress.value > 0.01 ? "auto" : "none",
}));
```

### 7.2 Thinking 접기/펼치기

```typescript
// Reanimated Layout
// 컨테이너에 entering={FadeInDown.duration(200)} exiting={FadeOutUp.duration(150)}
// 내부 아이템: Layout.springify().damping(15).stiffness(150)

const [expanded, setExpanded] = useState(false);
const contentHeight = useSharedValue(0);
const animatedHeight = useAnimatedStyle(() => ({
  height: expanded ? withSpring(contentHeight.value, MobileTokens.spring.gentle) : withTiming(0, { duration: 200 }),
  overflow: "hidden",
}));
```

### 7.3 메시지 목록 스크롤

```typescript
// 자동 스크롤: 새 메시지 + 하단 200px 이내일 때
// 스크롤 버튼: 하단에서 500px+ 떨어지면 표시
// 새 메시지 등장: entering={FadeInUp.duration(150)}
// 하이라이트: 검색 매치 시 2s 노란 배경 + fade out
```

### 7.4 입력바 전환

```typescript
// 텍스트 유무에 따른 버튼 전환:
// 🎤 ↔ ➤: withTiming opacity + scale (150ms)
// 높이 변경: onContentSizeChange → withSpring (gentle)
// 첨부 프리뷰 등장: entering={SlideInDown.duration(200)}
// DEEP 칩: entering={FadeIn.duration(100)}
```

### 7.5 스레드 삭제 스와이프

```typescript
// react-native-gesture-handler Swipeable
// 좌 스와이프: 핀 버튼 (보라) + 삭제 버튼 (빨강) 노출
// 삭제 확인: Alert.alert 또는 ActionSheet
// 삭제 후: LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
```

### 7.6 Pull-to-refresh

```typescript
// FlatList refreshControl 사용
// 트리거: 60px 풀다운
// 햅틱: Haptics.impactAsync(ImpactFeedbackStyle.Light) at trigger
// 인디케이터: 시스템 기본 (iOS: UIRefreshControl, Android: SwipeRefreshLayout)
```

---

## 8. 상태 관리 리디자인

### 8.1 신규 스토어

#### useDraftStore (NEW)
```typescript
interface DraftState {
  drafts: Record<string, string>;  // key: threadId or "overview"
  setDraft: (key: string, text: string) => void;
  getDraft: (key: string) => string;
  clearDraft: (key: string) => void;
}
// AsyncStorage 영속화 (300ms debounce)
```

#### useUsageGuardStore (NEW)
```typescript
interface UsageGuardState {
  isLocked: boolean;
  remaining: number;
  tier: string;
  dailyLimit: number;
  cooldownEnd: number | null;
  check: () => Promise<void>;
  // 서버: GET /api/me → usage 필드
}
```

#### useMemoryStore (NEW)
```typescript
interface MemoryState {
  memories: Memory[];
  loading: boolean;
  fetch: () => Promise<void>;
  update: (id: number, content: string) => Promise<void>;
  delete: (id: number) => Promise<void>;
  toggleLock: (id: number) => Promise<void>;
}
```

### 8.2 기존 스토어 확장

#### useMobileSidebarStore 확장
```typescript
// 추가 필드:
threadGroups: ThreadGroup[];       // 시간 그룹핑 결과
computeGroups: () => void;         // threads 변경 시 재계산
bumpThread: (id: number) => void;
moveToProject: (threadId: number, projectId: number | null) => void;
createProject: (name: string) => Promise<void>;
```

#### useMobileChatStore 확장
```typescript
// 추가 필드:
searchQuery: string;
searchMatches: number[];           // 매칭 message ID 목록
currentMatchIndex: number;
setSearchQuery: (q: string) => void;
nextMatch: () => void;
prevMatch: () => void;
clearSearch: () => void;
```

---

## 9. 네비게이션 구조

### 9.1 현재 구조

```
_layout (root)
├── index (route guard)
├── intro
├── auth
├── onboarding
├── (authed)
│   ├── chat/index (overview)
│   ├── chat/[threadId]
│   └── project/[projectId]
└── legal/*
```

### 9.2 리디자인 구조 (추가)

```
_layout (root)
├── index (route guard)
├── intro
├── auth
├── onboarding
├── (authed)
│   ├── chat/index (overview)
│   ├── chat/[threadId]
│   ├── project/[projectId]
│   ├── settings                    ← NEW (스택)
│   │   ├── index (메인)
│   │   ├── personalization
│   │   ├── billing
│   │   ├── memory
│   │   ├── notifications
│   │   ├── workspace
│   │   └── data
│   ├── upgrade                     ← NEW
│   ├── workspace                   ← NEW
│   │   ├── index
│   │   ├── team
│   │   └── invite
│   ├── share/[token]               ← NEW
│   └── join/[token]                ← NEW
├── legal/*
└── +not-found                      ← NEW
```

---

## 10. 구현 우선순위 & 일정

### Phase 1: 핵심 리디자인 (7일)

| # | 항목 | 파일 | 설명 |
|---|------|------|------|
| 1 | 디자인 토큰 시스템 | `constants/tokens.ts`, `constants/adaptive.ts` | MobileTokens + useAdaptive |
| 2 | ChatOverview 수정 | `MobileChatOverview.tsx` | 최근 스레드 제거 + 하단 입력 + QuickPromptBar |
| 3 | 입력바 리디자인 | `ChatInput.tsx` | 플로팅 카드 + 🎤/➤ 전환 + shadow |
| 4 | AI 아바타 추가 | `MobileAssistantMessage.tsx` | 28px 원형 "Y" + 이름 |
| 5 | 메시지 간격/레이아웃 | `MobileChatMessageList.tsx`, styles | gap 8→24, flat AI 스타일 |
| 6 | Thinking 접기/펼치기 | `ThinkingCollapsible.tsx` (NEW) | 인라인 토글, BottomSheet 대체 |
| 7 | 메시지 액션 SVG | `MessageActions.tsx` | lucide-react-native 아이콘 |
| 8 | 사이드바 시간 그룹 | `MobileSidebarContent.tsx`, `ThreadGroup.tsx` (NEW) | 오늘/어제/지난주 |
| 9 | 사이드바 ActionSheet | `MobileSidebarContent.tsx` | Alert → ActionSheetIOS / ActionSheet |
| 10 | 프로필 패널 | `SidebarProfilePanel.tsx` (NEW) | 사이드바 하단 프로필 |
| 11 | Pull-to-refresh | `MobileChatMessageList.tsx` | FlatList refreshControl |
| 12 | 테마 수동 선택 | 설정 + AsyncStorage | Light/Dark/System 3옵션 |

### Phase 2: 기능 갭 해소 (14일)

| # | 항목 | 파일 | 설명 |
|---|------|------|------|
| 13 | 음성 녹음/재생 | `VoiceRecordingBar.tsx`, `AudioBubble.tsx`, `useVoiceInput.ts` | expo-av 기반 |
| 14 | 메시지 검색 | `ChatSearchBar.tsx`, store 확장 | 스레드 내 검색 |
| 15 | 드래프트 저장 | `useDraftStore.ts`, ChatInput 연동 | AsyncStorage 영속 |
| 16 | 사용량 가드 | `useUsageGuardStore.ts` | 일일 제한 체크 |
| 17 | 4000줄 제한 | `ChatInput.tsx` | charCodeAt 카운트 + 경고 |
| 18 | 게스트 모드 | `MobileAuthContext.tsx` | 게스트 세션 자동 생성 |
| 19 | 설정 전체 | `app/(authed)/settings/*` | 7탭 네이티브 스택 |
| 20 | 빌링/업그레이드 | `BillingPanel.tsx`, `UpgradeScreen.tsx` | 웹 포팅 |
| 21 | 프로젝트 생성 | `ProjectSection.tsx`, API 연동 | 플랜 제한 체크 |
| 22 | 메시지 공유 링크 | `MessageActions.tsx` + API | expo-sharing |
| 23 | 스레드 범프 | `useMobileSidebarStore.ts` | API + 로컬 정렬 |
| 24 | 프로젝트 이동 | 사이드바 ActionSheet | 서브메뉴 + API |
| 25 | 워크스페이스 전환 | `MobileWorkspaceList.tsx` | API 연동 완성 |

### Phase 3: 고급 기능 (14일)

| # | 항목 | 설명 |
|---|------|------|
| 26 | KaTeX 수학 | react-native-katex 또는 WebView |
| 27 | Mermaid 다이어그램 | WebView + CDN |
| 28 | 스프레드시트 인라인 | 테이블 컴포넌트 |
| 29 | CSV 한국어 인코딩 | CP949 fallback |
| 30 | Quant 분석 블록 | 4 뷰타입 (Analyze/Forecast/Simulate/Risk) |
| 31 | 메모리 관리 | 스코프 아코디언 + 편집/삭제 |
| 32 | 워크스페이스 관리 | 팀/초대/권한 |
| 33 | 서포트 티켓 | 카테고리 + 본문 + 제출 |
| 34 | 공유 링크 뷰 | /share/[token] 읽기전용 |
| 35 | 워크스페이스 초대 | /join/[token] 참여 |
| 36 | Deep link 처리 | expo-linking + 라우팅 |
| 37 | 사이드바 검색 | 스레드 제목 필터 |
| 38 | 스크롤 위치 복원 | per-thread offset 저장 |

### Phase 4: 폴리시 (7일)

| # | 항목 | 설명 |
|---|------|------|
| 39 | 이미지 에디터 | expo-image-manipulator |
| 40 | 스튜디오 | 이미지/문서/비디오 (기본 UI) |
| 41 | 태블릿 레이아웃 | 고정 사이드바 + Thinking 우측 패널 |
| 42 | 햅틱 전체 적용 | expo-haptics 모든 터치 인터랙션 |
| 43 | 앱 아이콘 + 스플래시 | 리브랜딩 |
| 44 | FlashList 마이그레이션 | FlatList → FlashList |
| 45 | expo-image 캐싱 | Image → expo-image 교체 |
| 46 | 코드블록 강화 | Prism 수준 구문강조 |
| 47 | 다크모드 전환 애니메이션 | 부드러운 페이드 |
| 48 | 에러 바운더리 | 앱 크래시 방지 + 복구 UI |
| 49 | 오프라인 모드 | 캐싱 + 큐 + 재전송 |

---

## 11. 파일 구조

```
yua-mobile/
├── app/                           ← Expo Router 라우트
│   ├── _layout.tsx
│   ├── index.tsx
│   ├── intro/index.tsx
│   ├── auth/index.tsx
│   ├── onboarding/index.tsx
│   ├── (authed)/
│   │   ├── _layout.tsx
│   │   ├── chat/
│   │   │   ├── index.tsx          ← ChatOverview
│   │   │   └── [threadId].tsx     ← ChatScreen
│   │   ├── project/
│   │   │   └── [projectId].tsx
│   │   ├── settings/              ← NEW
│   │   │   ├── index.tsx
│   │   │   ├── personalization.tsx
│   │   │   ├── billing.tsx
│   │   │   ├── memory.tsx
│   │   │   ├── notifications.tsx
│   │   │   ├── workspace.tsx
│   │   │   └── data.tsx
│   │   ├── upgrade.tsx            ← NEW
│   │   ├── share/[token].tsx      ← NEW
│   │   └── join/[token].tsx       ← NEW
│   └── legal/
│       ├── terms/index.tsx
│       └── privacy/index.tsx
│
├── constants/
│   ├── theme.ts                   ← 색상 토큰 (기존 + 확장)
│   ├── tokens.ts                  ← 모바일 전용 토큰 (NEW)
│   └── adaptive.ts               ← 적응형 유틸리티 (NEW)
│
├── components/
│   ├── chat/
│   │   ├── ChatInput.tsx          ← 리디자인 (플로팅 카드)
│   │   ├── MobileChatOverview.tsx ← 리디자인 (스레드 제거)
│   │   ├── MobileChatMessageList.tsx ← 리디자인 (간격+pull)
│   │   ├── MobileAssistantMessage.tsx ← 리디자인 (아바타+flat)
│   │   ├── MobileUserMessage.tsx  ← 리디자인 (간격)
│   │   ├── MobileStreamOverlay.tsx
│   │   ├── MobileDeepThinkingDrawer.tsx ← 리디자인
│   │   ├── MobileTypingIndicator.tsx
│   │   ├── MobileChatMessageItem.tsx
│   │   ├── MobileAttachmentDisplay.tsx
│   │   ├── AttachmentPreviewRow.tsx
│   │   ├── ThinkingChunkCard.tsx
│   │   ├── MessageActions.tsx     ← 리디자인 (SVG)
│   │   ├── ThinkingCollapsible.tsx ← NEW (접기/펼치기)
│   │   ├── QuickPromptBar.tsx     ← NEW
│   │   ├── ChatSearchBar.tsx      ← NEW
│   │   ├── VoiceRecordingBar.tsx  ← NEW
│   │   ├── AudioBubble.tsx        ← NEW
│   │   ├── QuantAnalysisBlock.tsx ← NEW (P3)
│   │   ├── blocks/
│   │   │   ├── SuggestionBlock.tsx
│   │   │   └── EmojiContextLine.tsx
│   │   ├── image/
│   │   │   └── MobileImageSectionBlock.tsx
│   │   ├── input/
│   │   │   └── MobilePlusPanel.tsx
│   │   ├── primitives/
│   │   │   └── Stack.tsx, Panel.tsx, Card.tsx, Timeline.tsx
│   │   └── streams/
│   │       └── (기존 유지)
│   │
│   ├── sidebar/
│   │   ├── MobileSidebarContent.tsx ← 리디자인 (시간 그룹)
│   │   ├── ThreadGroup.tsx        ← NEW
│   │   ├── ThreadItem.tsx         ← NEW (스와이프)
│   │   ├── MobileProjectList.tsx
│   │   ├── ProjectSection.tsx     ← NEW (접기+생성)
│   │   └── SidebarProfilePanel.tsx ← NEW
│   │
│   ├── layout/
│   │   ├── MobileAppShell.tsx     ← 적응형 확장
│   │   ├── MobileTopBar.tsx
│   │   ├── MobileTopPanelHost.tsx
│   │   └── SidebarContext.tsx
│   │
│   ├── settings/                  ← 리디자인 (풀스크린)
│   │   ├── SettingsScreen.tsx     ← 리디자인
│   │   ├── PersonalizationPanel.tsx ← NEW
│   │   ├── BillingPanel.tsx       ← NEW
│   │   ├── MemoryPanel.tsx        ← NEW
│   │   ├── NotificationsPanel.tsx ← NEW
│   │   └── MobileWorkspaceList.tsx
│   │
│   ├── billing/
│   │   ├── UpgradeScreen.tsx      ← NEW
│   │   └── SmartUpgradeModal.tsx  ← NEW
│   │
│   ├── common/
│   │   ├── MobileMarkdown.tsx
│   │   ├── MobileCodeBlock.tsx
│   │   ├── MobileMermaidRenderer.tsx ← NEW (P3, WebView)
│   │   └── MobileKatexRenderer.tsx   ← NEW (P3)
│   │
│   ├── panel/
│   │   ├── BottomSlidePanel.tsx
│   │   ├── TopSlidePanel.tsx
│   │   ├── LeftSlidePanel.tsx
│   │   └── PanelBackdrop.tsx
│   │
│   └── activity/
│       ├── MobileActivityPanel.tsx
│       ├── MobileThinkPanel.tsx
│       └── MobilePhotoLibraryPanel.tsx
│
├── hooks/
│   ├── useTheme.ts
│   ├── useAdaptive.ts             ← NEW
│   ├── useKeyboardDock.ts
│   ├── useTopPanel.ts
│   ├── useMobileChatStream.ts
│   ├── useMobileSidebarData.ts
│   ├── useMobileThinkingProfile.ts
│   ├── useMobileLocalNotifications.ts
│   ├── useSuggestionFeedback.ts
│   ├── useVoiceInput.ts           ← NEW
│   ├── usePullToRefresh.ts        ← NEW
│   ├── useDraft.ts                ← NEW
│   ├── useUsageGuard.ts           ← NEW
│   └── use-color-scheme.ts
│
├── store/
│   ├── useMobileChatStore.ts      ← 확장 (검색)
│   ├── useMobileSidebarStore.ts   ← 확장 (그룹, 범프)
│   ├── useMobileStreamSessionStore.ts
│   ├── useMobileSettingsStore.ts
│   ├── useMobileShellStore.ts
│   ├── useMobileThreadStore.ts
│   ├── useDraftStore.ts           ← NEW
│   ├── useUsageGuardStore.ts      ← NEW
│   └── useMemoryStore.ts          ← NEW
│
├── features/
│   ├── chat/
│   │   ├── screens/MobileChatScreen.tsx
│   │   ├── hooks/
│   │   │   ├── useMobileChatController.ts
│   │   │   ├── useMobileChatSender.ts
│   │   │   └── useMobileChatStreamSession.ts
│   │   └── model/
│   │       ├── chat-message.types.ts
│   │       └── stream-event.mapper.ts
│   └── project/
│       ├── screens/MobileProjectOverviewScreen.tsx
│       └── hooks/useMobileProjectOverview.ts
│
├── contexts/
│   └── MobileAuthContext.tsx       ← 확장 (게스트)
│
├── adapters/stream/
│   ├── createMobileStreamClient.ts
│   └── mobileStreamTransport.ts
│
├── lib/
│   ├── api/
│   │   ├── mobileApiClient.ts
│   │   ├── chat.api.ts
│   │   ├── sidebar.api.ts
│   │   ├── upload.api.ts
│   │   ├── photo-library.api.ts
│   │   ├── billing.api.ts         ← NEW
│   │   ├── memory.api.ts          ← NEW
│   │   └── workspace.api.ts       ← NEW
│   ├── auth/
│   │   ├── firebase.client.ts
│   │   ├── mobileTokenProvider.ts
│   │   └── mobileAuth.types.ts
│   └── notifications/
│       ├── mobileNotifications.ts
│       └── notificationGuards.ts
│
└── types/
    ├── sidebar.ts
    ├── navigation.ts
    └── assets.ts
```

---

## 12. 기술 스택 추가

| 패키지 | 용도 | Phase | 비고 |
|--------|------|:-----:|------|
| `lucide-react-native` | SVG 아이콘 | P1 | 웹과 동일 아이콘셋 |
| `expo-haptics` | 햅틱 피드백 | P1 | iOS/Android 모두 지원 |
| `react-native-svg` | SVG 기반 (lucide 의존) | P1 | lucide 전제 |
| `expo-av` | 음성 녹음 + 오디오 재생 | P2 | 권한: AUDIO_RECORDING |
| `expo-sharing` | 메시지 공유 | P2 | iOS Share Sheet |
| `react-native-katex` | KaTeX 수학 | P3 | WebView 기반 |
| `react-native-webview` | Mermaid + KaTeX 호스트 | P3 | 이미 설치됨 (확인 필요) |
| `@shopify/flash-list` | 고성능 FlatList | P4 | 큰 스레드 성능 |
| `expo-image` | 이미지 캐싱/최적화 | P4 | blurhash 지원 |
| `expo-image-manipulator` | 이미지 편집 (크롭/회전) | P4 | - |
| `@react-native-community/hooks` | useAppState, useKeyboard 등 | P1 | 유틸리티 |
| `react-native-actions-sheet` | ActionSheet (Android 포함) | P1 | 또는 expo ActionSheet |

---

## 13. 즉시 수정 항목

### 13.1 ChatOverview 입력창 점프 (CRITICAL)

**파일**: `components/chat/MobileChatOverview.tsx`
**라인**: 191-222 (recent threads), 224-236 (input section)

**현재 문제**:
```tsx
// 라인 191-222: 비동기 로드 → 조건 렌더링 → 레이아웃 시프트
{recent.length > 0 && (
  <View style={styles.recentSection}>  // marginBottom: 24
    ...threads...
  </View>
)}
// 라인 224: 입력창이 ScrollView 안에 있음
<View style={styles.inputSection}>
  <ChatInput ... />
</View>
```

**수정**:
```tsx
// 1. recent threads 섹션 완전 제거
// 2. 입력창을 ScrollView 밖으로 이동
// 3. position: absolute, bottom: safeBottom

<View style={{ flex: 1 }}>
  <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}>
    {/* Hero + QuickPromptBar */}
  </ScrollView>
  <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
    <View style={{ paddingBottom: safeBottom, paddingHorizontal: inputPad }}>
      <ChatInput ... />
    </View>
  </KeyboardAvoidingView>
</View>
```

### 13.2 메시지 액션 이모지 → SVG (HIGH)

**파일**: `components/chat/MessageActions.tsx`

**현재**: `👍 👎 ⧉ ↻` (Text 이모지)
**수정**: `<ThumbsUp /> <ThumbsDown /> <Copy /> <RefreshCw />` (lucide-react-native)

### 13.3 메시지 간격 확대 (MEDIUM)

**파일**: `MobileChatMessageList.tsx`
**현재**: `ItemSeparatorComponent` gap 8px
**수정**: gap 20-24px (`MobileTokens.layout.messageGap`)

---

## 14. 성능 최적화 전략

### 14.1 메시지 목록
- **FlatList 최적화**: `windowSize: 7`, `maxToRenderPerBatch: 10`, `removeClippedSubviews: true`
- **Phase 4**: `@shopify/flash-list` 마이그레이션 (100+ 메시지 스레드)
- **memo**: `MobileChatMessageItem` 커스텀 areEqual (content, streaming, finalized만 비교)
- **이미지**: `expo-image` 캐싱 + blurhash placeholder

### 14.2 사이드바
- **시간 그룹 계산**: `useMemo` + threads 의존성만
- **스레드 아이템**: `React.memo` + id 기반 비교
- **스크롤**: `getItemLayout` 고정 높이 (48px)

### 14.3 스트리밍
- **토큰 배치**: 16ms 프레임 단위 배치 업데이트 (개별 토큰마다 setState 금지)
- **Thinking 청크**: `useShallow` 셀렉터 (변경된 청크만)
- **마크다운**: 스트리밍 중 경량 렌더링, finalized 후 풀 렌더링

### 14.4 셀렉터 패턴
```typescript
// BAD: 매 렌더마다 새 배열 참조
const threads = useStore(s => s.threads.filter(...));

// GOOD: getState() 또는 string 셀렉터
const threadTitle = useStore(
  useCallback(s => s.threads.find(t => t.id === id)?.title ?? "", [id])
);
```

---

## 15. 접근성 & 국제화

### 15.1 접근성 (A11y)
- 모든 터치 타겟: `accessibilityRole`, `accessibilityLabel`
- 메시지 목록: `accessibilityRole="list"`
- 아이콘 버튼: `accessibilityLabel="복사"` (텍스트 없는 버튼)
- Thinking 상태: `accessibilityLiveRegion="polite"` (스크린 리더 알림)
- 색상 대비: WCAG AA 기준 4.5:1 이상

### 15.2 국제화 (i18n)
- 현재: 한국어 하드코딩
- Phase 3+: `i18next` + `react-i18next` 도입 고려
- 우선순위: 낮음 (한국 시장 우선)

---

## Appendix A: 웹 기능 전체 체크리스트

### 채팅 컴포넌트 (45+)
- [x] ChatMain — 모바일 MobileChatScreen
- [x] ChatInput — 리디자인 필요
- [x] ChatMessage — MobileChatMessageItem
- [x] AssistantMessage — 리디자인 필요 (아바타+flat)
- [x] ChatMessageList — 리디자인 필요 (간격+pull)
- [x] StreamOverlay — MobileStreamOverlay
- [x] ThinkingPanel — 리디자인 → ThinkingCollapsible
- [x] DeepThinkingDrawer — 리디자인 (인라인)
- [ ] **QuickPromptBar** — P1 NEW
- [x] SuggestionBlock — 구현됨
- [ ] **VoiceButton** — P2 NEW
- [ ] **VoiceRecordingBar** — P2 NEW
- [ ] **AudioBubble** — P2 NEW
- [x] AttachmentPreview — 구현됨
- [△] FilePanel — 기본만 (스프레드시트 P3)
- [x] ImagePanel — 구현됨
- [ ] **ImageEditorModal** — P4 NEW
- [ ] **ChatSearchBar** — P2 NEW
- [△] MessageActions — SVG 교체 P1
- [ ] **QuantAnalysisBlock** — P3 NEW
- [x] ToolArtifactRenderer / ThinkingChunkCard — 구현됨
- [x] EmojiContextLine — 구현됨
- [x] MemoryIndicator — 구현됨
- [x] TypingIndicator — 구현됨
- [△] ChatPlusMenu — 부분 구현 (검색/포크 P2)
- [x] SystemMessageCard — 구현됨

### 훅 (14)
- [x] useChatStream — useMobileChatStream
- [x] useChatMessages — useMobileChatController
- [x] useChatSender — useMobileChatSender
- [x] useSidebarData — useMobileSidebarData
- [ ] **useBillingGuard** — P2 NEW
- [x] useThemePreference — useTheme
- [ ] **useWorkspaceTransition** — P2 (API 연동)
- [ ] **useVoiceInput** — P2 NEW
- [x] useThinkingProfile — useMobileThinkingProfile
- [ ] **usePullToRefresh** — P1 NEW
- [x] useSuggestionFeedback — 구현됨
- [ ] **useUsageGuard** — P2 NEW

### 스토어 (12)
- [x] useChatStore — useMobileChatStore
- [x] useStreamSessionStore — useMobileStreamSessionStore
- [x] useSidebarStore — useMobileSidebarStore (확장 필요)
- [ ] **useChatDraft** — P2 NEW (useDraftStore)
- [ ] **useMemoryIndicator** — P3
- [ ] **useMemoryDrawer** — P3 (useMemoryStore)
- [△] useWorkspaceStore — 기본 (확장 P2)
- [ ] **useStudioContext** — P4
- [x] useLoginModal — 구현됨
- [x] useSettingsUI — useMobileSettingsStore

### 라우트 (24)
- [x] / — index (route guard)
- [x] /chat — overview
- [x] /chat/[threadId] — 채팅
- [x] /project/[id] — 프로젝트
- [ ] **/settings/*** — P2 NEW (7개 서브라우트)
- [ ] **/upgrade** — P2 NEW
- [ ] **/workspace** — P3 NEW
- [ ] **/share/[token]** — P3 NEW
- [ ] **/join/[token]** — P3 NEW
- [ ] /studio/* — P4
- [ ] /guide — P4
- [x] /policies/* — 웹 링크

---

## Appendix B: 현재 모바일 파일 인벤토리

### 컴포넌트 (47 파일)
- `chat/` — 24 파일 (messages, input, blocks, image, primitives, streams)
- `sidebar/` — 4 파일 (content, thread list, project list, panel)
- `layout/` — 4 파일 (shell, top bar, panel host, sidebar context)
- `settings/` — 2 파일 (modal, workspace list)
- `panel/` — 4 파일 (backdrop, bottom, top, left slide panels)
- `activity/` — 3 파일 (panel, think panel, photo library panel)
- `common/` — 6 파일 (markdown, mermaid, code block, home hero/quick actions)

### 스토어 (6 파일)
- `useMobileChatStore.ts` — 메시지, 스트리밍
- `useMobileSidebarStore.ts` — 스레드, 프로젝트
- `useMobileSettingsStore.ts` — 설정 UI
- `useMobileStreamSessionStore.ts` — 스트림 세션
- `useMobileThreadStore.ts` — 스레드 상태
- `useMobileShellStore.ts` — 네비게이션

### 훅 (10 파일)
- `useTopPanel.ts`, `useTheme.ts`, `useKeyboardDock.ts`
- `useMobileChatStream.ts`, `useMobileLocalNotifications.ts`
- `useMobileSidebarData.ts`, `useMobileThinkingProfile.ts`
- `useSuggestionFeedback.ts`, `use-color-scheme.ts`, `use-color-scheme.web.ts`

### 리디자인 후 예상 파일 수
- 컴포넌트: 47 → **63** (+16)
- 스토어: 6 → **9** (+3)
- 훅: 10 → **15** (+5)
- 라우트: 9 → **17** (+8)
- **총 파일 증가: +32**
