# YUA Desktop App 설계 문서

> 작성일: 2026-03-08
> 상태: Draft v1 — 10-Agent 전수조사 기반
> 대상: Mac (macOS 12+) / Windows (10/11)

---

## 목차

1. [개요 및 포지셔닝](#1-개요-및-포지셔닝)
2. [프레임워크 선정](#2-프레임워크-선정)
3. [웹 코드 재사용 분석](#3-웹-코드-재사용-분석)
4. [아키텍처](#4-아키텍처)
5. [UX/UI 설계](#5-uxui-설계)
6. [보안 설계](#6-보안-설계)
7. [성능 최적화](#7-성능-최적화)
8. [빌드/CI/CD 파이프라인](#8-빌드cicd-파이프라인)
9. [테스트 전략](#9-테스트-전략)
10. [스토어 퍼블리싱](#10-스토어-퍼블리싱)
11. [수익화 전략](#11-수익화-전략)
12. [경쟁사 분석](#12-경쟁사-분석)
13. [플랫폼 허브 통합](#13-플랫폼-허브-통합)
14. [다국어 지원 (i18n)](#14-다국어-지원-i18n)
15. [로드맵](#15-로드맵)

---

## 1. 개요 및 포지셔닝

### 1.1 왜 데스크탑인가

| 채널 | 상태 | 주요 사용 시나리오 |
|-------|------|-------------------|
| yua-web | 운영 중 | 브라우저 기반, 가장 넓은 도달 |
| yua-mobile | 빌드 완료 | 이동 중, 간단한 질문/확인 |
| **yua-desktop** | **신규** | **장시간 작업, 키보드 중심, 시스템 통합** |

- 한국 최초 데스크탑 AI 채팅 앱 (ChatGPT/Claude 데스크탑은 한국어 최적화 없음)
- 브라우저 독립: 메모리 효율, 시스템 트레이 상주, 글로벌 단축키
- 파일시스템 직접 접근: 드래그&드롭, 로컬 파일 분석
- 오프라인 큐: 네트워크 끊김 시 메시지 큐잉 → 복구 시 자동 전송

### 1.2 제품 비전

```
"항상 곁에 있는 AI 비서 — 브라우저를 열지 않아도, 단축키 하나로."
```

- **Cmd/Ctrl+Shift+Y**: 어디서든 YUA 호출 (Spotlight/Alfred 스타일)
- **시스템 트레이**: 항상 상주, 알림 수신
- **Deep OS 통합**: 파일 연결, 공유 메뉴, 클립보드 감시

---

## 2. 프레임워크 선정

### 2.1 후보 비교

| 항목 | Electron | Tauri |
|------|----------|-------|
| 언어 | JS/TS (Node.js) | Rust + JS/TS (WebView) |
| 번들 크기 | 150-300MB | 5-15MB |
| 메모리 | 200-500MB | 50-150MB |
| 웹 코드 재사용 | 95%+ (Chromium) | 80-90% (OS WebView) |
| 네이티브 API | Node.js 풀 액세스 | Rust 플러그인 |
| 자동 업데이트 | electron-updater (성숙) | tauri-plugin-updater (안정) |
| 코드 서명 | 자동 (electron-builder) | 자동 (tauri-cli) |
| 개발 생태계 | 매우 성숙 (10년+) | 성장 중 (3년+, v2 안정) |
| 경쟁사 채택 | ChatGPT, Claude, Cursor, Perplexity | 극소수 |

### 2.2 결정: Electron (Phase 1) → Tauri 평가 (Phase 2)

**Phase 1 — Electron 선택 이유:**
1. yua-web (Next.js/React) 코드 95%+ 직접 재사용
2. 경쟁사 전원 Electron 사용 → 검증된 패턴
3. Node.js API로 파일시스템/프로세스 접근 용이
4. 출시 속도 최우선 (한국 시장 선점)

**Phase 2 — Tauri 전환 평가 기준:**
- Electron 앱 안정화 후 (출시 3개월+)
- 유저 피드백에서 "무겁다" 불만 시
- 번들 5-15MB = 한국 시장 차별화 포인트

### 2.3 Electron 버전 정책

```
Electron 35+ (Chromium 134+)
Node.js 22 LTS
```

---

## 3. 웹 코드 재사용 분석

### 3.1 재사용률 요약

| 계층 | 재사용률 | 비고 |
|------|---------|------|
| yua-shared (타입/계약) | 100% | 그대로 import |
| API 클라이언트 | 100% | fetch 기반, 변경 없음 |
| Zustand 스토어 | 95% | window 참조 제거만 필요 |
| 스트리밍 (StreamClient) | 100% | SSE, 브라우저/Node 모두 동작 |
| React 컴포넌트 (UI) | 70-80% | Tailwind → 데스크탑 레이아웃 조정 |
| 라우팅 | 30% | Next.js Router → electron-router 전환 |
| 인증 | 80% | Firebase Auth, 토큰 저장만 변경 |

### 3.2 총 재사용률: ~72%

### 3.3 재사용 전략

```
yua-shared/        → 100% 그대로 (workspace dependency)
yua-web/src/
  ├── stores/      → yua-desktop/src/stores/ (복사 후 경량 패치)
  ├── hooks/       → yua-desktop/src/hooks/ (API/스트림 훅 재사용)
  ├── components/  → yua-desktop/src/components/ (UI 조정)
  └── lib/api/     → yua-desktop/src/lib/api/ (거의 동일)
```

### 3.4 데스크탑 전용 모듈 (신규 개발)

| 모듈 | 설명 |
|------|------|
| `src/main/` | Electron main process (창 관리, 트레이, IPC) |
| `src/main/updater.ts` | 자동 업데이트 (electron-updater) |
| `src/main/tray.ts` | 시스템 트레이 아이콘/메뉴 |
| `src/main/shortcuts.ts` | 글로벌 단축키 등록 |
| `src/main/deeplink.ts` | yua:// 프로토콜 핸들러 |
| `src/main/file-handler.ts` | 드래그&드롭 파일 처리 |
| `src/preload/` | Context bridge (IPC 노출) |
| `src/renderer/desktop/` | 데스크탑 전용 UI (트레이 팝업, 미니 모드) |

---

## 4. 아키텍처

### 4.1 프로세스 구조

```
┌─────────────────────────────────────────────┐
│                Main Process                  │
│  ┌─────────┐ ┌──────────┐ ┌──────────────┐ │
│  │ Tray    │ │ Updater  │ │ Global       │ │
│  │ Manager │ │          │ │ Shortcuts    │ │
│  └─────────┘ └──────────┘ └──────────────┘ │
│  ┌─────────┐ ┌──────────┐ ┌──────────────┐ │
│  │ Window  │ │ File     │ │ Deep Link    │ │
│  │ Manager │ │ Handler  │ │ Handler      │ │
│  └─────────┘ └──────────┘ └──────────────┘ │
│         IPC Bridge (contextBridge)           │
├─────────────────────────────────────────────┤
│              Renderer Process                │
│  ┌──────────────────────────────────────┐   │
│  │        React App (from yua-web)      │   │
│  │  ┌────────┐ ┌───────┐ ┌──────────┐  │   │
│  │  │ Stores │ │ Hooks │ │ Components│  │   │
│  │  │(Zustand)│ │(Stream)│ │(Chat UI) │  │   │
│  │  └────────┘ └───────┘ └──────────┘  │   │
│  └──────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
         │
         ▼
    yua-backend (API + SSE)
```

### 4.2 IPC 설계

```typescript
// preload/index.ts
contextBridge.exposeInMainWorld('yuaDesktop', {
  // 파일
  openFile: () => ipcRenderer.invoke('file:open'),
  saveFile: (data: Buffer, name: string) => ipcRenderer.invoke('file:save', data, name),

  // 시스템
  minimize: () => ipcRenderer.send('window:minimize'),
  close: () => ipcRenderer.send('window:close'),
  toggleMiniMode: () => ipcRenderer.send('window:mini-toggle'),

  // 트레이
  setBadge: (count: number) => ipcRenderer.send('tray:badge', count),

  // 업데이트
  checkUpdate: () => ipcRenderer.invoke('updater:check'),
  installUpdate: () => ipcRenderer.send('updater:install'),
  onUpdateAvailable: (cb: () => void) => ipcRenderer.on('updater:available', cb),

  // 인증
  getSecureToken: () => ipcRenderer.invoke('auth:get-token'),
  setSecureToken: (token: string) => ipcRenderer.invoke('auth:set-token', token),

  // 클립보드
  readClipboard: () => ipcRenderer.invoke('clipboard:read'),
  writeClipboard: (text: string) => ipcRenderer.invoke('clipboard:write', text),
});
```

### 4.3 디렉토리 구조

```
yua-desktop/
├── package.json
├── electron-builder.yml
├── tsconfig.json
├── src/
│   ├── main/
│   │   ├── index.ts              # 앱 진입점
│   │   ├── window-manager.ts     # 창 생성/관리
│   │   ├── tray.ts               # 시스템 트레이
│   │   ├── shortcuts.ts          # 글로벌 단축키
│   │   ├── updater.ts            # 자동 업데이트
│   │   ├── deeplink.ts           # yua:// 프로토콜
│   │   ├── file-handler.ts       # 파일 드래그&드롭
│   │   └── ipc-handlers.ts       # IPC 핸들러 등록
│   ├── preload/
│   │   └── index.ts              # contextBridge
│   ├── renderer/
│   │   ├── App.tsx               # React 루트
│   │   ├── routes.tsx            # 라우팅 (react-router)
│   │   ├── stores/               # ← yua-web 스토어 재사용
│   │   ├── hooks/                # ← yua-web 훅 재사용
│   │   ├── components/           # ← yua-web 컴포넌트 + 데스크탑 전용
│   │   │   ├── chat/             # 채팅 UI
│   │   │   ├── sidebar/          # 사이드바
│   │   │   ├── desktop/          # 데스크탑 전용
│   │   │   │   ├── TitleBar.tsx  # 커스텀 타이틀바
│   │   │   │   ├── TrayPopup.tsx # 트레이 팝업
│   │   │   │   └── MiniMode.tsx  # 미니 모드
│   │   │   └── layout/
│   │   └── lib/
│   │       ├── api/              # ← yua-web API 재사용
│   │       └── desktop-bridge.ts # IPC 래퍼
│   └── shared/                   # 데스크탑 내부 공유
│       └── constants.ts
├── resources/
│   ├── icon.icns                 # macOS 아이콘
│   ├── icon.ico                  # Windows 아이콘
│   ├── icon.png                  # Linux/공통
│   └── tray-icon.png             # 트레이 아이콘
└── build/                        # 빌드 출력
```

---

## 5. UX/UI 설계

### 5.1 디자인 원칙

1. **웹과 동일한 채팅 경험** — 학습 비용 제로
2. **데스크탑 네이티브 느낌** — 커스텀 타이틀바, 시스템 트레이, 드래그&드롭
3. **미니 모드** — 작업 중 빠른 질문, 화면 구석에 떠 있는 작은 창
4. **다크/라이트 자동 전환** — OS 테마 감지
5. **Quick Launch 오버레이** — Spotlight 스타일, 어디서든 즉시 질문

### 5.2 메인 레이아웃

```
+--------+------------------------------------------+--------------+
| SIDEBAR|              CHAT AREA                   | RIGHT PANEL  |
| 280px  |           (flex: 1)                      | 360px        |
| (coll- |                                          | (conditional)|
| apsible|  +------------------------------------+  |              |
| to 0)  |  |      Message List (scroll)         |  | Deep Thinking|
|        |  |                                    |  | File Preview |
|  [New] |  |  [User Message]                    |  | Settings     |
|  [Srch]|  |  [Assistant Response]              |  | Memory Log   |
|        |  |  [User Message]                    |  |              |
| -------|  |  [Assistant Response]              |  |              |
| Threads|  |  ...                               |  |              |
|  - T1  |  |                                    |  |              |
|  - T2  |  +------------------------------------+  |              |
|  - T3  |  |         Chat Input Bar             |  |              |
| -------|  | [+] [textarea        ] [Send/Stop] |  |              |
| Projects  | [attach] [model sel]  [think mode] |  |              |
|  - P1  |  +------------------------------------+  |              |
|  - P2  |  |  disclaimer footer                 |  |              |
+--------+------------------------------------------+--------------+
```

- **사이드바**: 280px, Cmd/Ctrl+B 토글, 200ms ease-out 애니메이션
- **채팅 영역**: max-width 768px 중앙 정렬 (yua-web 동일)
- **우측 패널**: 360px (리사이즈 가능 280-480px), 조건부 표시

### 5.3 윈도우 모드

| 모드 | 크기 | 최소 크기 | 용도 |
|------|------|----------|------|
| 풀 모드 | 1200x800 (기본) | 720x500 | 일반 채팅, 사이드바 포함 |
| 컴팩트 | 800x600 | 720x500 | 사이드바 숨김, 채팅만 |
| 미니 | 400x500 | - | 항상 위에, 빠른 질문 |
| 트레이 팝업 | 360x480 | - | 트레이 클릭 시 작은 패널 |
| Quick Launch | 600x80→300 | - | Spotlight 스타일 오버레이 |

### 5.4 커스텀 타이틀바

**macOS:**
```
+--[traffic lights]------------------[title: YUA]--------------------+
|  Custom title bar, no native title bar                             |
|  Traffic lights (close/minimize/zoom) inset 20px left, 48px header |
|  Title bar area is draggable for window move                       |
|  Optional vibrancy/translucency on sidebar                         |
+--------------------------------------------------------------------+
```

**Windows:**
```
+--[icon]--[YUA]----------------------------------[_ ][box][X]------+
|  Custom title bar with Windows Snap Layouts support (Win11)        |
|  Dark/light title bar matches app theme                            |
+--------------------------------------------------------------------+
```

- `frame: false` + CSS `-webkit-app-region: drag`

### 5.5 Quick Launch 오버레이 (Spotlight 스타일)

**트리거:** Option+Space (macOS) / Ctrl+Space (Windows)

```
+--------------------------------------------------+
|    +------------------------------------------+  |
|    | [YUA icon] YUA에게 질문하기...            |  |
|    +------------------------------------------+  |
|                                                  |
|    Shift+Enter: 줄바꿈  |  Enter: 전송          |
|    Tab: 전체 앱 열기                             |
+--------------------------------------------------+
```

- 프레임리스, 화면 중앙 떠 있는 창 (600x80, 텍스트 입력 시 600x300 확장)
- Frosted glass 배경 (macOS vibrancy / Windows Mica)
- Enter → 응답 인라인 스트리밍, Tab → 전체 앱으로 전환
- Esc 또는 바깥 클릭 → 닫힘

**응답 포함 확장:**
```
+--------------------------------------------------+
|    +------------------------------------------+  |
|    | [YUA icon] 한국의 GDP는?                  |  |
|    +------------------------------------------+  |
|                                                  |
|    2024년 기준 한국의 GDP는 약 1.7조 달러로,      |
|    세계 13위 규모입니다...                        |
|                                                  |
|    [Tab으로 전체 앱에서 이어하기]                  |
+--------------------------------------------------+
```

### 5.6 글로벌 단축키

| macOS | Windows | 동작 | 범위 |
|-------|---------|------|------|
| Opt+Space | Ctrl+Space | Quick Launch 오버레이 | 글로벌 |
| Cmd+Shift+S | Ctrl+Shift+S | 스크린샷 캡처 & 전송 | 글로벌 |
| Cmd+N | Ctrl+N | 새 채팅 | 앱 내 |
| Cmd+K | Ctrl+K | 명령어 팔레트 | 앱 내 |
| Cmd+B | Ctrl+B | 사이드바 토글 | 앱 내 |
| Cmd+Shift+V | Ctrl+Shift+V | 클립보드 컨텍스트 질문 | 앱 내 |
| Cmd+Shift+T | Ctrl+Shift+T | 항상 위에 토글 | 앱 내 |
| Cmd+, | Ctrl+, | 설정 | 앱 내 |
| Cmd+1~9 | Ctrl+1~9 | 최근 스레드 전환 | 앱 내 |
| Cmd+Enter | Ctrl+Enter | 메시지 전송 | 입력 |
| Esc | Esc | 생성 중지 / 패널 닫기 | 앱 내 |
| Cmd+F | Ctrl+F | 대화 내 검색 | 채팅 |
| Cmd+Shift+F | Ctrl+Shift+F | 전체 스레드 검색 | 앱 내 |

### 5.7 명령어 팔레트 (Cmd/Ctrl+K)

```
+--------------------------------------------------+
|  +----------------------------------------------+|
|  | > 명령어를 입력하세요...                       ||
|  +----------------------------------------------+|
|  최근                                             |
|    [chat] 새 대화 시작                            |
|    [search] 대화 검색                             |
|    [model] 모델 변경                              |
|  도구                                             |
|    [screenshot] 스크린샷 캡처                     |
|    [file] 파일 첨부                               |
|    [clipboard] 클립보드 내용 보내기               |
|  설정                                             |
|    [theme] 다크 모드 전환                          |
|    [shortcut] 단축키 설정                         |
+--------------------------------------------------+
```

- Fuzzy 검색 (명령어 + 스레드 + 프로젝트)
- 화살표 키 탐색, Enter 선택
- 최근 사용 명령어 상단 표시

### 5.8 시스템 트레이

**macOS Menu Bar:**
```
+---------------------------+
| YUA                       |
+---------------------------+
| 새 대화           Cmd+N   |
| 빠른 질문         Opt+Spc |
+---------------------------+
| 최근 대화                  |
|   > Thread title 1        |
|   > Thread title 2        |
+---------------------------+
| 스크린샷 캡처     Cmd+Sh+S |
| 항상 위에 표시             |
| 시작 시 실행              |
+---------------------------+
| 설정...           Cmd+,   |
| YUA 종료          Cmd+Q   |
+---------------------------+
```

**트레이 아이콘 상태:**

| 상태 | 아이콘 | 설명 |
|------|--------|------|
| Idle | 모노크롬 YUA 로고 | 대기 중 |
| Streaming | 파란 점 펄스 | AI 생성 중 |
| Notification | 빨간 점 뱃지 | 미읽음 알림 |
| Offline | 회색 + 슬래시 | 네트워크 끊김 |

### 5.9 스크린샷 캡처 & 전송

**트리거:** Cmd+Shift+S / Ctrl+Shift+S

1. 화면 어둡게 + 크로스헤어 커서
2. 사각형 드래그 (Space: 전체화면, hover-click: 윈도우 선택)
3. 주석 도구바: 화살표, 사각형, 텍스트, 블러, 색상
4. 확인 → 현재 채팅 입력에 자동 첨부

```
[캡처 모드]
+--------------------------------------------------+
|  (dimmed screen overlay)                         |
|     +-------------------+                        |
|     | Selected region   |  <-- 밝은 영역         |
|     +-------------------+                        |
|  ESC: 취소  |  Enter: 캡처  |  Space: 전체화면    |
+--------------------------------------------------+
```

### 5.10 파일 드래그&드롭

- 드롭 존: 채팅 입력 영역 (기본) + 전체 채팅 영역 (오버레이)
- 지원: PNG, JPG, PDF, DOCX, CSV, XLSX, JSON, 코드 파일 등
- 제한: 파일당 50MB, 메시지당 200MB
- 드롭 시 자동 첨부 + 미리보기 (웹의 AttachmentPreview 재사용)
- 파일 타입별 자동 분석 제안:
  - CSV/XLSX: "데이터 분석", "트렌드 파악"
  - PDF: "문서 요약", "핵심 추출"
  - 이미지: "이미지 설명", "OCR"
  - 코드: "코드 리뷰", "버그 찾기"

### 5.11 온보딩 플로우

1. **Welcome** — YUA 로고 애니메이션 (rotateY 지구본, yua-mobile 동일)
2. **Login** — Google OAuth (시스템 브라우저 → `yua://auth?code=xxx` 딥링크) + 이메일
3. **Permissions** — 알림 허용, 시작 시 자동 실행, Quick Launch 단축키
4. **Quick Tour** (건너뛰기 가능) — 사이드바, 채팅 입력, Quick Launch, 사고 모드

### 5.12 플랫폼별 차이

| 기능 | macOS | Windows |
|------|-------|---------|
| 타이틀바 | 트래픽 라이트 좌측 | 최소화/최대화/닫기 우측 |
| 반투명 효과 | NSVisualEffect (vibrancy) | Mica/Acrylic (Win11) |
| 독/작업표시줄 | 뱃지 카운트, 우클릭 메뉴 | Jump list, 오버레이 뱃지 |
| 알림 | Notification Center | Toast Notification (버튼 포함) |
| Snap | - | Snap Layouts (Win11 maximize hover) |
| 키체인 | macOS Keychain | Windows Credential Manager |
| 스펠체크 | NSSpellChecker | Windows Spell Checking API |
| IME | 네이티브 한/중/일 | 네이티브 풀 IME |

### 5.13 한국어 UI 텍스트

| 키 | 한국어 | 맥락 |
|----|--------|------|
| new_chat | 새 대화 | 사이드바, 메뉴, 단축키 |
| quick_question | 빠른 질문 | 트레이, 오버레이 |
| send | 보내기 | 채팅 입력 |
| stop | 중지 | 생성 중 |
| settings | 설정 | 메뉴, 트레이 |
| dark_mode | 다크 모드 | 설정, 메뉴 |
| always_on_top | 항상 위에 표시 | 트레이, 메뉴 |
| screenshot | 스크린샷 캡처 | 메뉴, 트레이 |
| file_drop | 파일을 여기에 놓으세요 | 드롭 오버레이 |
| offline_msg | 인터넷에 연결되지 않았습니다 | 오프라인 배너 |
| thinking | 사고 중... | Deep thinking 표시 |
| disclaimer | YUA는 실수를 할 수 있습니다. | 채팅 하단 |

---

## 6. 보안 설계

### 6.1 위협 모델

| 위협 | 심각도 | 대응 |
|------|--------|------|
| 토큰 탈취 (로컬 파일) | 높음 | Electron safeStorage (OS 키체인) |
| XSS via 채팅 응답 | 높음 | CSP 엄격 설정 + DOMPurify |
| IPC 우회 (preload 변조) | 중간 | contextIsolation: true, sandbox: true |
| 자동 업데이트 MITM | 높음 | 코드 서명 검증 + HTTPS only |
| 로컬 DB 탈취 | 중간 | SQLCipher / 암호화 스토리지 |
| Node integration 악용 | 높음 | nodeIntegration: false (기본) |

### 6.2 Electron 보안 체크리스트

```typescript
// main/window-manager.ts
const mainWindow = new BrowserWindow({
  webPreferences: {
    nodeIntegration: false,          // 필수
    contextIsolation: true,          // 필수
    sandbox: true,                   // 필수
    webSecurity: true,               // 필수
    allowRunningInsecureContent: false,
    preload: path.join(__dirname, '../preload/index.js'),
  },
});

// CSP 설정
session.defaultSession.webRequest.onHeadersReceived((details, cb) => {
  cb({
    responseHeaders: {
      ...details.responseHeaders,
      'Content-Security-Policy': [
        "default-src 'self';",
        "script-src 'self';",
        "style-src 'self' 'unsafe-inline';",
        "connect-src 'self' https://*.yuaone.com wss://*.yuaone.com;",
        "img-src 'self' data: https:;",
      ].join(' '),
    },
  });
});
```

### 6.3 인증 토큰 저장

```typescript
import { safeStorage } from 'electron';

// 암호화 저장 (OS 키체인 활용)
function storeToken(token: string): void {
  const encrypted = safeStorage.encryptString(token);
  fs.writeFileSync(tokenPath, encrypted);
}

function getToken(): string | null {
  if (!fs.existsSync(tokenPath)) return null;
  const encrypted = fs.readFileSync(tokenPath);
  return safeStorage.decryptString(encrypted);
}
```

### 6.4 PIPA (개인정보보호법) 준수

- 수집 데이터: 이메일, 채팅 내용 (서버 전송), 사용 통계 (opt-in)
- 로컬 저장: 인증 토큰만 (암호화), 채팅 내용 로컬 저장 없음
- 삭제 요청: 웹과 동일한 계정 삭제 플로우
- 동의: 첫 실행 시 개인정보 처리방침 동의 화면

---

## 7. 성능 최적화

### 7.1 Performance SLA

| 메트릭 | 목표 | 열화 | 위험 |
|--------|------|------|------|
| Cold start (스플래시) | < 500ms | < 1s | > 2s |
| Cold start (인터랙티브) | < 2s | < 3s | > 5s |
| Warm start (트레이) | < 300ms | < 500ms | > 1s |
| 첫 토큰 렌더 (SSE 연결 후) | < 100ms | < 200ms | > 500ms |
| 스트리밍 FPS | 60fps | 45fps | < 30fps |
| 메모리 (유휴) | < 150MB | < 225MB | > 300MB |
| 메모리 (스트리밍 중) | < 250MB | < 375MB | > 500MB |
| 인스톨러 크기 | < 80MB | < 100MB | > 150MB |
| P95 IPC 왕복 | < 5ms | < 15ms | > 50ms |
| 채팅 히스토리 로드 (500건) | < 200ms | < 500ms | > 1s |

### 7.2 시작 최적화

**Phase 모델:**
```
T+0ms     프로세스 스폰
T+100ms   네이티브 창 생성, 스플래시 표시
T+200ms   렌더러 critical JS 로딩 시작
T+500ms   React 마운트, 셸 레이아웃 렌더
T+600ms   OS 키체인에서 인증 토큰 조회
T+800ms   인증 검증 (로컬 JWT 디코드, 네트워크 아님)
T+1000ms  마지막 열린 스레드 로컬 SQLite 캐시에서 렌더
T+1200ms  백그라운드: 사이드바, 스레드 목록 fetch
T+2000ms  백그라운드: 업데이트 체크, 알림 동기화
```

**Critical Path (즉시 로드):**
- react, react-dom, Zustand 스토어, Auth 부트스트랩, 라우터 셸

**Deferred (인터랙티브 후 로드):**
- markdown-it + 코드 하이라이팅, Mermaid 렌더러, 사이드바 데이터
- 설정 스토어, 알림 설정, Deep Thinking Drawer

**BrowserWindow 설정:**
```typescript
const mainWindow = new BrowserWindow({
  show: false,                 // ready-to-show 이벤트까지 숨김
  backgroundColor: '#0a0a0a', // 흰색 플래시 방지
  webPreferences: {
    backgroundThrottling: false, // SSE 유지 (최소화 시)
    v8CacheOptions: 'bypassHeatCheckAndEagerCompile',
  },
});
mainWindow.once('ready-to-show', () => mainWindow.show());
```

### 7.3 스트리밍 토큰 배칭 (60fps)

문제: 토큰 100+/초 → setState 100+/초 → markdown 전체 재파싱

**해결: requestAnimationFrame 배칭**

```typescript
class TokenBatcher {
  private buffer = '';
  private rafId: number | null = null;

  constructor(private onFlush: (batch: string) => void) {}

  push(token: string) {
    this.buffer += token;
    if (this.rafId === null) {
      this.rafId = requestAnimationFrame(() => {
        const batch = this.buffer;
        this.buffer = '';
        this.rafId = null;
        this.onFlush(batch);
      });
    }
  }
}
```

→ 1프레임(~16ms) 내 모든 토큰을 하나의 setState로 병합, 렌더 60/초 제한

**증분 Markdown 렌더링:**
- "확정된 블록" (완성된 문단/코드블록) → 메모이제이션 (변경 없음)
- "활성 테일" (마지막 미완성 부분, ~500자 이하) → 매 프레임 재파싱
- 결과: 스트리밍 중 markdown 파싱 입력 90%+ 감소

### 7.4 메모리 관리

| 상태 | 예산 | 방법 |
|------|------|------|
| 유휴 (채팅 없음) | < 150MB | 트레이 모드에서 렌더러 언로드 |
| 1 스레드 활성 | < 200MB | 가상 스크롤 (@tanstack/react-virtual) |
| 10 스레드 캐시 | < 350MB | LRU 캐시, 스레드당 최대 200 메시지 |
| 피크 (heavy markdown) | +50-80MB | 확정 블록 메모이제이션 |

**메시지 메모리 관리:**
- 스레드당 200 메시지 초과 시 → 오래된 메시지 SQLite로 아카이브
- 이미지 첨부: 디스크 저장 + 썸네일(200x200) 미리보기, 전체 해상도는 클릭 시
- LRU 첨부 캐시: 50MB 예산

**CSS Containment:**
```css
.message-item { contain: content; content-visibility: auto; }
.message-streaming { contain: layout style; will-change: contents; }
```

### 7.5 로컬 SQLite 캐시

오프라인 읽기 + 빠른 시작을 위한 로컬 DB:

```sql
CREATE TABLE threads (
  id TEXT PRIMARY KEY, title TEXT, project_id TEXT,
  created_at TEXT, updated_at TEXT, last_message_at TEXT,
  sync_version INTEGER DEFAULT 0
);

CREATE TABLE messages (
  id TEXT PRIMARY KEY, thread_id TEXT NOT NULL,
  role TEXT NOT NULL, content TEXT, attachments TEXT,
  created_at TEXT, sync_version INTEGER DEFAULT 0
);

CREATE VIRTUAL TABLE messages_fts USING fts5(
  content, content=messages, content_rowid=rowid
);

CREATE TABLE outbox (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL, payload TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now')),
  retry_count INTEGER DEFAULT 0
);
```

- `better-sqlite3` (Electron) — 동기식, 빠름
- WAL 모드: 쓰기 중 읽기 가능
- FTS5: 전체 메시지 풀텍스트 검색
- Outbox: 오프라인 시 메시지 큐잉 → 복구 시 자동 전송

### 7.6 네트워크

- **SSE 재연결**: 지수 백오프 (1s, 2s, 4s, ... 30s max), `Last-Event-ID` 헤더
- **Stale-While-Revalidate**: 캐시 데이터 즉시 반환 → 백그라운드 갱신 → 델타 적용
- **요청 중복 제거**: 빠른 스레드 전환 시 동일 API 호출 병합
- **백그라운드 동기화**: 사이드바 60초, 미읽음 30초 주기
- **App Nap 방지 (macOS)**: 스트리밍 중 `powerSaveBlocker.start('prevent-app-suspension')`

### 7.7 번들 최적화

```
Vite (renderer 빌드)
├── 코드 스플릿: auth ~50KB, chat ~200KB, settings ~30KB, mermaid ~150KB (lazy)
├── 트리쉐이킹: yua-shared에서 필요한 것만
├── 미니파이: terser (drop_console)
├── 소스맵: production에서 Sentry 업로드
└── 총 JS: < 5MB 목표
```

### 7.8 경쟁사 벤치마크 비교

| 메트릭 | ChatGPT Desktop | Claude Desktop | YUA 목표 |
|--------|-----------------|----------------|----------|
| Cold start | ~3-4초 | ~2-3초 | < 2초 |
| 메모리 (유휴) | ~300MB | ~250MB | < 150MB |
| 메모리 (스트리밍) | ~400MB | ~350MB | < 250MB |
| 인스톨러 (macOS) | ~200MB | ~180MB | < 80MB |
| 스트리밍 FPS | ~50-60 | ~55-60 | 60 |

---

## 8. 빌드/CI/CD 파이프라인

### 8.1 빌드 도구

```
electron-builder (v25+)
├── macOS: DMG + ZIP (자동 업데이트용)
├── Windows: NSIS installer + ZIP (자동 업데이트용)
└── 코드 서명: 빌드 시 자동 적용
```

### 8.2 빌드 매트릭스

| 플랫폼 | 아키텍처 | 아티팩트 | 서명 |
|--------|----------|---------|------|
| macOS | x64 (Intel) | .dmg, .zip | Apple Developer ID |
| macOS | arm64 (Apple Silicon) | .dmg, .zip | Apple Developer ID |
| Windows | x64 | .exe (NSIS), .zip | EV Code Signing Cert |
| Windows | arm64 | .exe (NSIS), .zip | EV Code Signing Cert |

### 8.3 GitHub Actions CI/CD

```yaml
# .github/workflows/desktop-build.yml
name: Desktop Build & Release
on:
  push:
    tags: ['desktop-v*']

jobs:
  build:
    strategy:
      matrix:
        include:
          - os: macos-14        # Apple Silicon runner
            arch: arm64
          - os: macos-13        # Intel runner
            arch: x64
          - os: windows-latest
            arch: x64

    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }

      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter yua-shared build
      - run: pnpm --filter yua-desktop build

      # macOS 코드 서명 + 공증
      - name: Sign & Notarize (macOS)
        if: runner.os == 'macOS'
        env:
          APPLE_ID: ${{ secrets.APPLE_ID }}
          APPLE_ID_PASSWORD: ${{ secrets.APPLE_APP_PASSWORD }}
          APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
          CSC_LINK: ${{ secrets.MAC_CERT_P12 }}
          CSC_KEY_PASSWORD: ${{ secrets.MAC_CERT_PASSWORD }}
        run: pnpm --filter yua-desktop dist

      # Windows 코드 서명
      - name: Sign (Windows)
        if: runner.os == 'Windows'
        env:
          WIN_CSC_LINK: ${{ secrets.WIN_CERT_PFX }}
          WIN_CSC_KEY_PASSWORD: ${{ secrets.WIN_CERT_PASSWORD }}
        run: pnpm --filter yua-desktop dist

      - uses: actions/upload-artifact@v4
        with:
          name: desktop-${{ matrix.os }}-${{ matrix.arch }}
          path: yua-desktop/build/*.{dmg,zip,exe}

  release:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
      - uses: softprops/action-gh-release@v2
        with:
          files: desktop-*/**
          generate_release_notes: true
```

### 8.4 자동 업데이트

```typescript
// main/updater.ts
import { autoUpdater } from 'electron-updater';

autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

// 업데이트 서버: GitHub Releases (무료)
// 또는 자체 서버: https://update.yuaone.com/desktop
autoUpdater.setFeedURL({
  provider: 'github',
  owner: 'yuaone',
  repo: 'yua-desktop',
});

autoUpdater.on('update-available', () => {
  mainWindow.webContents.send('updater:available');
});

autoUpdater.on('update-downloaded', () => {
  mainWindow.webContents.send('updater:downloaded');
});

// 1시간마다 체크
setInterval(() => autoUpdater.checkForUpdates(), 60 * 60 * 1000);
```

---

## 9. 테스트 전략

### 9.1 테스트 피라미드

```
         ╱╲
        ╱ E2E ╲         Playwright (5-10 시나리오)
       ╱────────╲
      ╱Integration╲     Vitest + Electron (IPC, 업데이트, 트레이)
     ╱──────────────╲
    ╱   Unit Tests    ╲  Vitest (스토어, 유틸, 훅)
   ╱────────────────────╲
```

### 9.2 테스트 범위

| 계층 | 도구 | 대상 |
|------|------|------|
| Unit | Vitest | Zustand 스토어, API 클라이언트, 유틸 |
| Component | Vitest + Testing Library | React 컴포넌트 |
| Integration | Vitest + Electron mock | IPC 핸들러, 파일 핸들러, 업데이터 |
| E2E | Playwright (Electron) | 로그인 → 채팅 → 파일 첨부 → 전송 |
| Visual | Chromatic (선택) | UI 회귀 감지 |

### 9.3 E2E 시나리오 (핵심 5개)

1. **앱 시작 → 로그인 → 채팅 전송 → 응답 수신**
2. **파일 드래그&드롭 → 첨부 확인 → 전송**
3. **글로벌 단축키 → 미니모드 → 질문 → 닫기**
4. **자동 업데이트 알림 → 다운로드 → 재시작**
5. **오프라인 → 메시지 큐 → 온라인 복구 → 전송**

---

## 10. 스토어 퍼블리싱

### 10.1 Microsoft Store

#### 준비물

| 항목 | 상태 | 소요 시간 |
|------|------|----------|
| MS Partner Center 계정 | 필요 | 1일 |
| D-U-N-S Number (법인) | **병목** | 5-10 영업일 |
| 개인 개발자 (대안) | 가능 | 즉시 ($19 일회성) |
| EV Code Signing Cert | 필요 | 1-3 영업일 |
| 개인정보처리방침 URL | yuaone.com/privacy | 있음 |

#### 수수료

| 항목 | 비율 |
|------|------|
| 앱 내 구독 (Store 결제) | 15% (소규모 개발자 혜택) |
| 자체 결제 (Store 외) | 0% |
| 무료 앱 | 0% |

#### 퍼블리싱 전략

1. **Phase 1**: 자체 웹사이트 배포 (.exe 직접 다운로드) — 수수료 0%
2. **Phase 2**: MS Store 등록 — 도달 범위 확대, 자동 업데이트 통합
3. 구독 결제는 자체 결제 시스템 유지 (yuaone.com) → 수수료 0%

#### MSIX 패키징

```yaml
# electron-builder.yml
win:
  target:
    - target: nsis      # 직접 배포용
    - target: appx      # MS Store용
  appx:
    identityName: "YuaOne.YUA"
    publisher: "CN=xxx"  # Partner Center에서 발급
    publisherDisplayName: "YuaOne"
    applicationId: "YUA"
```

### 10.2 macOS 배포

#### Mac App Store vs 직접 배포

| 항목 | Mac App Store | 직접 배포 (Notarized) |
|------|-------------|---------------------|
| 수수료 | 15-30% | 0% |
| 샌드박스 | 필수 (제한적) | 불필요 |
| 자동 업데이트 | App Store | electron-updater |
| 도달 범위 | App Store 검색 | 웹사이트 다운로드 |

#### 결정: 직접 배포 (Phase 1) + MAS 검토 (Phase 2)

- Apple Developer Program ($99/년) 필요
- 공증(Notarization) 필수 → Gatekeeper 통과
- DMG 배포: 다운로드 → 드래그 → Applications

### 10.3 코드 서명 비용 요약

| 항목 | 비용 | 주기 |
|------|------|------|
| Apple Developer Program | $99 | 연간 |
| Windows EV Code Signing | $200-500 | 연간 |
| MS Partner Center (개인) | $19 | 일회성 |
| **총 연간 비용** | **~$300-600** | |

---

## 11. 수익화 전략

### 11.1 가격 모델

**무료 앱 + 구독 모델** (경쟁사 전원 동일 패턴)

| 플랜 | 가격 | 데스크탑 기능 |
|------|------|-------------|
| Free | 0원 | 기본 채팅, 일 20회 제한 |
| Pro | ₩15,000/월 | 무제한 채팅, DEEP 모드, 파일 분석 |
| Business | ₩30,000/월/인 | 팀 공유, 프로젝트, API 연동 |

- 웹/모바일/데스크탑 동일 구독 (크로스 플랫폼 구독)
- 데스크탑 전용 추가 요금 없음

### 11.2 수익 예측 (12개월)

```
전제:
- 데스크탑 DAU 목표: M3 1K → M6 5K → M12 15K
- Pro 전환율: 5-8% (업계 평균)
- ARPU: ₩12,000/월 (Pro+Business 혼합)

M3:  DAU 1K  × 5% = 50명  × ₩12K = ₩600K/월
M6:  DAU 5K  × 6% = 300명 × ₩12K = ₩3.6M/월
M12: DAU 15K × 8% = 1.2K명 × ₩12K = ₩14.4M/월

연간 누적: ~₩80M (약 $60K)
```

### 11.3 경쟁사 대비 차별화

| 경쟁사 | 가격 | YUA 차별화 |
|--------|------|-----------|
| ChatGPT Plus | $20/월 | 한국어 최적화, 더 저렴 |
| Claude Pro | $20/월 | 한국어 UX, 통합 플랫폼 |
| Cursor | $20/월 | 범용 AI (코딩 전용 아님) |

---

## 12. 경쟁사 분석

### 12.1 데스크탑 LLM 앱 현황

| 앱 | 프레임워크 | 크기 | 특징 |
|----|-----------|------|------|
| ChatGPT Desktop | Electron | ~250MB | 글로벌 단축키, 스크린샷 분석, 심플 UI |
| Claude Desktop | Electron | ~200MB | MCP (Model Context Protocol), 파일 연동 |
| Cursor | Electron (VSCode fork) | ~350MB | AI 코드 에디터, 터미널 통합 |
| Perplexity Desktop | Electron | ~200MB | 웹 검색 통합, 소스 인용 |
| Windsurf (Codeium) | Electron (VSCode) | ~300MB | AI 코드 에디터 |

### 12.2 공통 패턴 (학습 포인트)

1. **전원 Electron** — 검증된 선택
2. **글로벌 단축키 필수** — Option+Space (ChatGPT), Cmd+; (Perplexity)
3. **시스템 트레이 상주** — 항상 접근 가능
4. **자동 업데이트** — 사용자 개입 없이 최신 유지
5. **미니 모드/팝업** — 빠른 질문용 작은 창
6. **무료 + 구독** — 데스크탑 앱 자체는 무료

### 12.3 YUA 차별화 전략

| 영역 | 경쟁사 부재/약점 | YUA 강점 |
|------|----------------|----------|
| 한국어 | 번역 수준 UI | 네이티브 한국어 UX, PIPA 준수 |
| 멀티 플랫폼 | 웹+데스크탑만 | 웹+모바일+데스크탑 통합 |
| 가격 | $20/월 | ₩15,000/월 (30% 저렴) |
| SDK/API | 별도 플랫폼 | 통합 플랫폼 (개발자+소비자) |
| 사고 프로필 | 없음/단일 | FAST/NORMAL/DEEP 선택 |

---

## 13. 플랫폼 허브 통합

### 13.1 platform.yuaone.com 다운로드 허브

platform.yuaone.com은 YUA 전체 제품군의 **중앙 진입점** 역할.

```
platform.yuaone.com/
├── /                    → 메인 랜딩 (제품 소개, CTA)
├── /download            → 다운로드 허브 (핵심 페이지)
│   ├── OS 자동 감지 → 맞는 버전 하이라이트
│   ├── macOS (Intel / Apple Silicon)
│   ├── Windows (x64 / ARM64)
│   ├── Mobile (App Store / Google Play 링크)
│   └── Web → yuaone.com 링크
├── /download/desktop    → 데스크탑 상세 (기능 소개 + 다운로드)
├── /download/mobile     → 모바일 상세 (스크린샷 + 스토어 링크)
├── /pricing             → 통합 가격표 (Free/Pro/Business)
├── /docs                → API 문서
└── /dashboard           → 개발자 대시보드
```

### 13.2 다운로드 페이지 UI 설계

```
┌─────────────────────────────────────────────────────┐
│                                                      │
│              YUA를 어디서든 만나보세요                 │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────┐│
│  │  🖥️ Web  │  │ 💻 Desktop│  │ 📱 Mobile│  │ ⚡ API││
│  │          │  │          │  │          │  │      ││
│  │ 브라우저 │  │ Mac/Win  │  │ iOS/AOS  │  │ SDK  ││
│  │ 바로시작 │  │ 다운로드  │  │ 다운로드  │  │ 시작  ││
│  └──────────┘  └──────────┘  └──────────┘  └──────┘│
│                                                      │
│  ─────── 당신의 OS: macOS (Apple Silicon) ─────────  │
│                                                      │
│  [ ⬇️ YUA for Mac (Apple Silicon) 다운로드 ]         │
│  [ Intel Mac용 다운로드 ]  [ Windows용 다운로드 ]     │
│                                                      │
│  v1.0.0 • 15MB • macOS 12+                          │
│  릴리스 노트 보기                                    │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### 13.3 OS 자동 감지 로직

```typescript
function detectPlatform(): DownloadOption {
  const ua = navigator.userAgent;
  const platform = navigator.platform;

  if (/Mac/.test(platform)) {
    // Apple Silicon 감지
    const isAppleSilicon = /Mac/.test(platform) &&
      (navigator.userAgent.includes('ARM') ||
       // GL renderer 체크 (WebGL)
       isAppleSiliconByGL());
    return isAppleSilicon ? 'mac-arm64' : 'mac-x64';
  }
  if (/Win/.test(platform)) return 'win-x64';
  if (/Android/.test(ua)) return 'android';
  if (/iPhone|iPad/.test(ua)) return 'ios';
  return 'web';
}
```

### 13.4 YUA_PLATFORM_ADMIN_DESIGN.md 연동

플랫폼 설계 문서의 라우트에 다음 추가 필요:

```
/download                → 다운로드 허브 (OS 자동 감지)
/download/desktop        → 데스크탑 상세
/download/desktop/release-notes → 릴리스 노트
/download/mobile         → 모바일 상세
```

---

## 14. 다국어 지원 (i18n)

### 14.1 지원 언어 (Phase별)

| Phase | 언어 | 코드 | 우선순위 |
|-------|------|------|---------|
| Phase 1 (MVP) | 한국어 | `ko` | 기본 언어 |
| Phase 1 (MVP) | 영어 | `en` | 스토어 필수 |
| Phase 2 | 일본어 | `ja` | 아시아 시장 |
| Phase 2 | 중국어 (간체) | `zh-CN` | 아시아 시장 |
| Phase 3 | 스페인어 | `es` | 글로벌 확장 |
| Phase 3 | 프랑스어 | `fr` | 글로벌 확장 |
| Phase 3 | 독일어 | `de` | 유럽 시장 |

### 14.2 기술 스택

```
i18next + react-i18next
├── 네임스페이스 분리 (common, chat, settings, onboarding, store)
├── 언어 감지: OS locale → 유저 설정 → fallback(en)
├── 번역 파일: JSON (src/locales/{lang}/{namespace}.json)
└── 빌드 시 포함 (CDN 로드 아님 — 오프라인 지원)
```

### 14.3 디렉토리 구조

```
src/locales/
├── ko/
│   ├── common.json       # 공통 (버튼, 상태, 에러)
│   ├── chat.json         # 채팅 UI
│   ├── settings.json     # 설정
│   ├── onboarding.json   # 온보딩/인증
│   └── store.json        # 스토어 메타데이터
├── en/
│   ├── common.json
│   ├── chat.json
│   ├── settings.json
│   ├── onboarding.json
│   └── store.json
└── ja/ ...
```

### 14.4 번역 키 설계 (주요)

```json
// ko/common.json
{
  "app_name": "YUA",
  "new_chat": "새 대화",
  "send": "보내기",
  "stop": "중지",
  "settings": "설정",
  "dark_mode": "다크 모드",
  "light_mode": "라이트 모드",
  "quit": "종료",
  "search": "검색...",
  "cancel": "취소",
  "confirm": "확인",
  "delete": "삭제",
  "rename": "이름 변경",
  "copy": "복사",
  "share": "공유",
  "retry": "다시 시도",
  "offline": "인터넷에 연결되지 않았습니다",
  "update_available": "새 버전이 있습니다",
  "update_now": "지금 업데이트",
  "update_later": "나중에"
}

// en/common.json
{
  "app_name": "YUA",
  "new_chat": "New Chat",
  "send": "Send",
  "stop": "Stop",
  "settings": "Settings",
  "dark_mode": "Dark Mode",
  "light_mode": "Light Mode",
  "quit": "Quit",
  "search": "Search...",
  "cancel": "Cancel",
  "confirm": "Confirm",
  "delete": "Delete",
  "rename": "Rename",
  "copy": "Copy",
  "share": "Share",
  "retry": "Retry",
  "offline": "No internet connection",
  "update_available": "Update available",
  "update_now": "Update Now",
  "update_later": "Later"
}
```

```json
// ko/chat.json
{
  "placeholder": "YUA에게 메시지 보내기...",
  "thinking": "사고 중...",
  "disclaimer": "YUA는 실수를 할 수 있습니다.",
  "quick_question": "빠른 질문",
  "recent_chats": "최근 대화",
  "projects": "프로젝트",
  "file_drop": "파일을 여기에 놓으세요",
  "file_drop_types": "이미지, PDF, 코드, CSV",
  "screenshot": "스크린샷 캡처",
  "clipboard_ask": "클립보드에서 질문",
  "always_on_top": "항상 위에 표시",
  "auto_launch": "시작 시 자동 실행",
  "thinking_profile": {
    "fast": "빠르게",
    "normal": "기본",
    "deep": "깊게"
  },
  "message_actions": {
    "copy": "답변 복사",
    "share": "공유",
    "retry": "다시 생성",
    "fork": "가지치기"
  }
}

// en/chat.json
{
  "placeholder": "Message YUA...",
  "thinking": "Thinking...",
  "disclaimer": "YUA can make mistakes.",
  "quick_question": "Quick Question",
  "recent_chats": "Recent Chats",
  "projects": "Projects",
  "file_drop": "Drop files here",
  "file_drop_types": "Images, PDFs, code, CSV",
  "screenshot": "Capture Screenshot",
  "clipboard_ask": "Ask from Clipboard",
  "always_on_top": "Always on Top",
  "auto_launch": "Launch at Startup",
  "thinking_profile": {
    "fast": "Fast",
    "normal": "Normal",
    "deep": "Deep"
  },
  "message_actions": {
    "copy": "Copy Response",
    "share": "Share",
    "retry": "Regenerate",
    "fork": "Fork Conversation"
  }
}
```

### 14.5 언어 감지 및 전환

```typescript
// src/renderer/lib/i18n.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const SUPPORTED_LANGS = ['ko', 'en', 'ja', 'zh-CN'] as const;

function detectLanguage(): string {
  // 1. 유저 설정 (로컬 저장)
  const saved = localStorage.getItem('yua-lang');
  if (saved && SUPPORTED_LANGS.includes(saved as any)) return saved;

  // 2. OS locale
  const osLang = navigator.language; // e.g. 'ko-KR', 'en-US', 'ja-JP'
  const base = osLang.split('-')[0];
  if (SUPPORTED_LANGS.includes(base as any)) return base;

  // 3. 중국어 특수 처리
  if (osLang.startsWith('zh')) return 'zh-CN';

  // 4. fallback
  return 'en';
}

i18n.use(initReactI18next).init({
  lng: detectLanguage(),
  fallbackLng: 'en',
  ns: ['common', 'chat', 'settings', 'onboarding', 'store'],
  defaultNS: 'common',
  interpolation: { escapeValue: false },
  resources: { /* 빌드 시 번들 */ },
});
```

### 14.6 스토어 메타데이터 다국어

**MS Store:**

```json
// ko/store.json
{
  "title": "YUA - AI 비서",
  "short_description": "항상 곁에 있는 AI 비서. 단축키 하나로 어디서든 호출.",
  "description": "YUA는 한국어에 최적화된 AI 채팅 데스크탑 앱입니다.\n\n주요 기능:\n- 글로벌 단축키로 어디서든 즉시 호출\n- 시스템 트레이 상주\n- 파일 드래그&드롭 분석\n- 다크/라이트 모드\n- 오프라인 대화 기록 열람\n- FAST/NORMAL/DEEP 사고 모드",
  "keywords": "AI,채팅,비서,한국어,ChatGPT,데스크탑"
}

// en/store.json
{
  "title": "YUA - AI Assistant",
  "short_description": "Your always-on AI assistant. Summon with a shortcut, anywhere.",
  "description": "YUA is a desktop AI chat app optimized for Korean and English.\n\nKey Features:\n- Global shortcut to summon from anywhere\n- System tray integration\n- Drag & drop file analysis\n- Dark/Light mode\n- Offline conversation history\n- FAST/NORMAL/DEEP thinking modes",
  "keywords": "AI,chat,assistant,Korean,ChatGPT,desktop"
}

// ja/store.json
{
  "title": "YUA - AIアシスタント",
  "short_description": "いつもそばにいるAIアシスタント。ショートカット一つでどこからでも呼び出し。",
  "description": "YUAは韓国語・英語・日本語に対応したデスクトップAIチャットアプリです。\n\n主な機能:\n- グローバルショートカットでどこからでも即座に呼び出し\n- システムトレイ常駐\n- ファイルドラッグ＆ドロップ分析\n- ダーク/ライトモード\n- オフライン会話履歴\n- FAST/NORMAL/DEEP思考モード",
  "keywords": "AI,チャット,アシスタント,韓国語,デスクトップ"
}
```

### 14.7 날짜/숫자 로컬라이제이션

```typescript
// Intl API 활용 (네이티브, 번들 0)
const formatDate = (date: Date, lang: string) =>
  new Intl.DateTimeFormat(lang, {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(date);

const formatNumber = (n: number, lang: string) =>
  new Intl.NumberFormat(lang).format(n);

// 사용 예
formatDate(new Date(), 'ko');    // "2026. 3. 8. 오후 2:30"
formatDate(new Date(), 'en');    // "Mar 8, 2026, 2:30 PM"
formatDate(new Date(), 'ja');    // "2026年3月8日 14:30"
```

### 14.8 RTL 지원 (미래)

현재 지원 언어에 RTL 없음. 아랍어/히브리어 추가 시:
- CSS `direction: rtl` + `logical properties` (margin-inline-start 등)
- i18next `dir` 속성으로 자동 전환

### 14.9 번역 워크플로우

```
1. 개발자: ko/en 키 추가 (코드 작성 시)
2. CI: i18next-parser로 누락 키 자동 감지
3. 번역: JSON 파일 직접 편집 (Phase 1) → Crowdin/Weblate (Phase 3)
4. 검수: 네이티브 스피커 리뷰
5. 릴리스: 번역 파일 번들에 포함
```

### 14.10 yua-web / yua-mobile 공유

- 번역 키 네이밍 컨벤션 통일 → 추후 `yua-shared/locales/` 로 공통화 가능
- 데스크탑 전용 키 (tray, shortcut, window 관련)만 `yua-desktop` 내부 유지
- 채팅/인증/설정 키는 3개 클라이언트 공통

---

## 15. 로드맵

### Phase 1: MVP (4주)

```
Week 1: 프로젝트 세팅
  - yua-desktop 패키지 생성 (pnpm workspace)
  - Electron + Vite + React 보일러플레이트
  - yua-web 스토어/훅/API 복사 + 패치
  - 커스텀 타이틀바 + 기본 윈도우 관리

Week 2: 핵심 기능
  - 인증 (Firebase + safeStorage)
  - 채팅 UI (웹 컴포넌트 포팅)
  - SSE 스트리밍 (StreamClient 연결)
  - 사이드바 (스레드/프로젝트)
  - i18n 세팅 (i18next, ko + en 기본)

Week 3: 데스크탑 기능
  - 시스템 트레이
  - 글로벌 단축키 (Cmd/Ctrl+Shift+Y)
  - 파일 드래그&드롭
  - 다크/라이트 모드 (OS 테마 감지)

Week 4: 빌드 + QA
  - electron-builder 설정
  - macOS 코드 서명 + 공증
  - Windows 코드 서명
  - E2E 테스트 (핵심 5개 시나리오)
  - 버그 수정 + 성능 최적화
```

### Phase 2: 안정화 (2주)

```
Week 5-6:
  - 자동 업데이트 (electron-updater)
  - 미니 모드
  - 오프라인 큐
  - 트레이 팝업
  - platform.yuaone.com 다운로드 페이지
  - MS Store 제출 준비 (MSIX)
  - 일본어(ja) + 중국어(zh-CN) 번역 추가
```

### Phase 3: 확장 (진행)

```
Month 3+:
  - MS Store 퍼블리싱
  - Mac App Store 검토
  - Tauri 전환 평가
  - 플러그인 시스템 (MCP 대응)
  - 화면 캡처 + OCR 분석
  - 클립보드 감시 (opt-in)
```

---

## 부록 A: 의존성 목록

### Main Dependencies

```json
{
  "electron": "^35.0.0",
  "electron-updater": "^6.0.0",
  "electron-log": "^5.0.0",
  "electron-store": "^10.0.0"
}
```

### Renderer Dependencies (yua-web 공유)

```json
{
  "react": "^18.3.0",
  "react-dom": "^18.3.0",
  "react-router-dom": "^7.0.0",
  "zustand": "^5.0.0",
  "firebase": "^12.0.0",
  "yua-shared": "workspace:*"
}
```

### Dev Dependencies

```json
{
  "electron-builder": "^25.0.0",
  "electron-vite": "^3.0.0",
  "vite": "^6.0.0",
  "vitest": "^3.0.0",
  "@playwright/test": "^1.50.0",
  "typescript": "^5.7.0"
}
```

---

## 부록 B: electron-builder 설정

```yaml
# electron-builder.yml
appId: com.yuaone.yua-desktop
productName: YUA
copyright: Copyright 2026 YuaOne

directories:
  output: build
  buildResources: resources

files:
  - "dist/**/*"
  - "package.json"

mac:
  category: public.app-category.productivity
  target:
    - target: dmg
      arch: [x64, arm64]
    - target: zip
      arch: [x64, arm64]
  icon: resources/icon.icns
  hardenedRuntime: true
  gatekeeperAssess: false
  entitlements: build/entitlements.mac.plist
  entitlementsInherit: build/entitlements.mac.plist
  notarize:
    teamId: ${APPLE_TEAM_ID}

win:
  target:
    - target: nsis
      arch: [x64, arm64]
    - target: appx
      arch: [x64]
  icon: resources/icon.ico
  certificateSubjectName: "YuaOne"
  signingHashAlgorithms: [sha256]

nsis:
  oneClick: false
  perMachine: false
  allowToChangeInstallationDirectory: true
  deleteAppDataOnUninstall: false

publish:
  provider: github
  owner: yuaone
  repo: yua-desktop
  releaseType: release
```

---

## Sources
- [Electron Security Checklist](https://www.electronjs.org/docs/latest/tutorial/security)
- [Tauri v2 Documentation](https://v2.tauri.app/)
- [MS Store App Submission](https://learn.microsoft.com/en-us/windows/apps/publish/)
- [Apple Developer Notarization](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)
- [electron-builder Documentation](https://www.electron.build/)
- ChatGPT Desktop, Claude Desktop, Cursor, Perplexity Desktop 참고
