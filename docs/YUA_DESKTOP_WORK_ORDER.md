# YUA Desktop 구현 작업 지시서 (SSOT)

> 새 세션에서 이 문서를 읽고 순서대로 진행하면 됨.
> 설계 문서: /home/dmsal020813/projects/YUA_DESKTOP_DESIGN.md

## 전제 조건
- 프레임워크: Electron 35+ (단일 코드베이스 → Windows .exe + macOS .dmg)
- yua-web 코드 72% 재사용 (stores, hooks, API, components)
- pnpm workspace에 yua-desktop 추가
- 자동 업데이트 필수 (electron-updater)

## 작업 순서 (10 Batch, 하네스 엔지니어링)

### Batch 1: 프로젝트 스캐폴딩 (5 에이전트)
| # | 에이전트 | 파일 (exclusive) | 설명 |
|---|---------|-----------------|------|
| 1 | Project init | package.json, tsconfig.json, electron-builder.yml | pnpm workspace 등록, Electron 35 + React 18 + Tailwind |
| 2 | Main process | src/main/index.ts, src/main/window-manager.ts | 앱 진입점, BrowserWindow 생성, show:false→ready-to-show |
| 3 | Preload + IPC | src/preload/index.ts, src/main/ipc-handlers.ts | contextBridge, 파일/시스템/인증/클립보드 IPC |
| 4 | Renderer shell | src/renderer/App.tsx, src/renderer/routes.tsx, src/renderer/index.html | React 루트, react-router, HTML 진입점 |
| 5 | Build config | electron-builder.yml, resources/ | macOS(dmg+zip), Windows(nsis), 아이콘, 코드서명 placeholder |

### Batch 2: 코어 UI 재사용 (5 에이전트)
| # | 에이전트 | 파일 | 설명 |
|---|---------|------|------|
| 6 | Stores 복사+패치 | src/renderer/stores/ | yua-web stores → window 참조 제거, IPC 토큰 저장 |
| 7 | Hooks 복사+패치 | src/renderer/hooks/ | useChatStream, useSidebarData 등 재사용 |
| 8 | API 클라이언트 | src/renderer/lib/api/, desktop-bridge.ts | yua-web API 재사용 + IPC 래퍼 |
| 9 | Auth 플로우 | src/renderer/contexts/DesktopAuthContext.tsx | Firebase Auth + safeStorage 토큰 저장 + 시스템 브라우저 OAuth |
| 10 | 공통 컴포넌트 | src/renderer/components/common/ | Markdown, CodeBlock, MermaidRenderer 복사 |

### Batch 3: 채팅 UI (5 에이전트)
| # | 에이전트 | 파일 | 설명 |
|---|---------|------|------|
| 11 | ChatMain + MessageList | src/renderer/components/chat/ | yua-web ChatMain 포팅 |
| 12 | ChatInput | src/renderer/components/chat/ChatInput.tsx | 입력바 + 파일 D&D + 모델 선택 |
| 13 | Sidebar | src/renderer/components/sidebar/ | 사이드바 + 검색 + 시간 그룹 |
| 14 | StreamOverlay + Thinking | src/renderer/components/chat/ | 스트리밍 UI + DeepThinking |
| 15 | Settings modal | src/renderer/components/settings/ | yua-web SettingsModal 포팅 |

### Batch 4: 데스크탑 전용 기능 (5 에이전트)
| # | 에이전트 | 파일 | 설명 |
|---|---------|------|------|
| 16 | Custom TitleBar | src/renderer/components/desktop/TitleBar.tsx | macOS 트래픽라이트 / Windows min/max/close |
| 17 | System Tray | src/main/tray.ts | 트레이 아이콘, 메뉴, 뱃지, 상태 |
| 18 | Global Shortcuts | src/main/shortcuts.ts | Cmd+Shift+Y, Opt+Space Quick Launch |
| 19 | Quick Launch | src/renderer/components/desktop/QuickLaunch.tsx, src/main/quick-launch-window.ts | Spotlight 오버레이 (600x80→300) |
| 20 | Auto Updater | src/main/updater.ts | electron-updater, 토스트 알림, 설치+재시작 |

### Batch 5: 고급 기능 (5 에이전트)
| # | 에이전트 | 파일 | 설명 |
|---|---------|------|------|
| 21 | File D&D handler | src/main/file-handler.ts | 드래그&드롭 + 파일 타입 감지 + 자동 분석 제안 |
| 22 | Deep Link | src/main/deeplink.ts | yua:// 프로토콜 등록 + OAuth 콜백 수신 |
| 23 | Mini Mode | src/renderer/components/desktop/MiniMode.tsx, window-manager 확장 | 400x500 항상 위 |
| 24 | Command Palette | src/renderer/components/desktop/CommandPalette.tsx | Cmd+K, fuzzy 검색 |
| 25 | Screenshot Capture | src/main/screenshot.ts | 화면 캡처 + 크롭 + 채팅 첨부 |

### Batch 6: 성능 + 폴리시 (5 에이전트)
| # | 에이전트 | 파일 | 설명 |
|---|---------|------|------|
| 26 | TokenBatcher | src/renderer/lib/token-batcher.ts | rAF 배칭 (60fps 스트리밍) |
| 27 | SQLite 캐시 | src/main/sqlite-cache.ts | better-sqlite3, 오프라인 읽기 |
| 28 | Onboarding | src/renderer/components/desktop/Onboarding.tsx | Welcome→Login→Permissions→Tour |
| 29 | 다크모드 | CSS 변수 + OS 감지 | prefers-color-scheme 연동 |
| 30 | QA 2중 검증 | 전체 | 기능 QA + 디자인 QA |

## 실행 방법
1. 이 문서 읽기
2. YUA_DESKTOP_DESIGN.md 참조
3. Batch 단위로 10개씩 에이전트 투입 (하네스 엔지니어링)
4. 각 Batch 완료 후 lint + QA 검증
5. 다음 Batch 진행

## 핵심 규칙
- pnpm workspace에 yua-desktop 추가 (pnpm-workspace.yaml)
- yua-shared는 workspace dependency로 import (복제 금지)
- Electron 보안: nodeIntegration:false, contextIsolation:true, sandbox:true
- safeStorage로 토큰 저장 (OS 키체인)
- 자동 업데이트 필수 (electron-updater + GitHub Releases)
- 코드 서명: macOS (Apple Developer), Windows (자체 서명 → 추후 EV)
