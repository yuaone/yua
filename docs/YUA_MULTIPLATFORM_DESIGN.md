# YUA Multi-Platform Distribution 설계 문서

> 작성일: 2026-03-08
> 상태: Draft v1
> 대상: macOS Desktop, Windows Desktop, CLI (`npx yuan`), Auth/Token Architecture
> 참조: YUA_DESKTOP_DESIGN.md, YUAN_DESIGN.md

---

## 목차

1. [개요](#1-개요)
2. [macOS Desktop App](#2-macos-desktop-app)
3. [Windows Desktop App](#3-windows-desktop-app)
4. [CLI (npx yuan)](#4-cli-npx-yuan)
5. [Auth Token Architecture](#5-auth-token-architecture)
6. [Plan-based Token Separation](#6-plan-based-token-separation)
7. [5-Hour Token Usage Window Design](#7-5-hour-token-usage-window-design)
8. [Backend Integration Points](#8-backend-integration-points)
9. [Cross-Platform Code Sharing Strategy](#9-cross-platform-code-sharing-strategy)
10. [Rollout Roadmap](#10-rollout-roadmap)

---

## 1. 개요

### 1.1 멀티플랫폼 비전

YUA AI 오케스트레이터는 단일 브라우저 앱을 넘어, 사용자가 어디서든 동일한 AI 경험을 받을 수 있는 멀티플랫폼 전략을 추구한다.

```
                    YUA Backend (SSOT)
                         |
         +---------------+---------------+
         |               |               |
    yua-web          yua-desktop       yuan CLI
   (Next.js)        (Electron)        (npm pkg)
         |               |               |
    yua-mobile      macOS + Win      npx yuan
   (Expo/RN)                         @yuaone/yuan
```

### 1.2 플랫폼별 포지셔닝

| 플랫폼 | 핵심 시나리오 | 주 사용자 |
|--------|-------------|----------|
| yua-web | 브라우저 기반 범용 접근 | 모든 사용자 |
| yua-mobile | 이동 중 간단한 질문/확인 | 일반 사용자 |
| yua-desktop (macOS) | 장시간 작업, 키보드 중심, 시스템 통합 | 파워 유저, 개발자 |
| yua-desktop (Windows) | 동일 (Windows 생태계 통합) | 파워 유저, 기업 사용자 |
| yuan CLI | 터미널 기반 에이전트 실행, 자동화 | 개발자, DevOps |

### 1.3 공유 원칙

- **Auth/Token은 전 플랫폼 통합**: 하나의 계정으로 모든 플랫폼 접근
- **yua-shared가 타입/계약 SSOT**: 플랫폼별 타입 중복 정의 금지
- **Plan 기반 제어**: 모든 플랫폼에서 동일한 Plan 정책 적용
- **Backend API 단일화**: 플랫폼별 별도 API 없음, 동일 엔드포인트 사용

---

## 2. macOS Desktop App

### 2.1 프레임워크

- **Phase 1**: Electron 35+ (Chromium 기반, yua-web 코드 최대 재사용)
- **Phase 2**: Tauri 평가 (번들 크기 150-300MB -> 5-15MB 축소 가능성)

Phase 1에서 Electron을 선택하는 이유:
- yua-web (Next.js/React) 코드의 ~72% 직접 재사용 가능
- Node.js 풀 액세스로 파일시스템/프로세스 제어 용이
- electron-updater로 성숙한 자동 업데이트
- ChatGPT, Claude, Cursor, Perplexity 등 경쟁사 전원 Electron 사용

### 2.2 핵심 기능

| 기능 | 설명 |
|------|------|
| System Tray | 메뉴바 상주, 상태 표시 (streaming/idle/error), 빠른 액션 |
| Global Shortcut | `Cmd+Shift+Y` — 어디서든 YUA 호출 (Spotlight 스타일 미니 모드) |
| Mini Mode | 300x400 플로팅 윈도우, 빠른 질문/응답, 드래그로 위치 조정 |
| File Drag & Drop | Finder에서 파일 드래그하면 자동 첨부 + 분석 |
| DAG Visualization | YUAN 오케스트레이터의 병렬 에이전트 실행 상태를 실시간 DAG로 시각화 |
| Offline Queue | 네트워크 끊김 시 메시지 큐잉, 복구 시 자동 전송 |

### 2.3 코드 재사용 (yua-web -> yua-desktop)

```
재사용 가능 (~72%):
  - Zustand stores (chat, auth, memory, sidebar, theme)
  - React hooks (useChat, useStream, useAuth, useSidebar)
  - API 클라이언트 (fetch wrapper, SSE handler)
  - UI 컴포넌트 (ChatMain, MessageList, CodeBlock, QuantAnalysis, etc.)
  - Tailwind CSS / globals.css

Desktop 전용 구현 (~28%):
  - Electron main process (IPC, tray, shortcuts, auto-update)
  - Native 파일시스템 통합 (drag-drop handler, file watcher)
  - OS 알림 통합 (Notification Center)
  - DAG 시각화 대시보드 (electron-specific canvas)
  - 미니 모드 윈도우 관리
  - Deep link handler (yua:// protocol)
```

### 2.4 네이티브 기능

#### 2.4.1 safeStorage + Keychain

```typescript
// Electron safeStorage API로 토큰 암호화
import { safeStorage } from 'electron';

function storeToken(token: string): Buffer {
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Encryption not available');
  }
  return safeStorage.encryptString(token);
  // macOS: Keychain에 마스터 키 저장
  // 암호화된 버퍼는 로컬 파일에 저장
}

function retrieveToken(encrypted: Buffer): string {
  return safeStorage.decryptString(encrypted);
}
```

- macOS Keychain에 암호화 마스터 키 위임
- 앱 삭제 시 Keychain 항목도 함께 정리 (uninstall hook)

#### 2.4.2 Spotlight 통합

```
Spotlight 검색에서 YUA 대화 기록 검색 가능
- CoreSpotlight API 활용
- 대화 제목 + 요약을 인덱싱
- 검색 결과 클릭 시 해당 대화로 이동
```

### 2.5 자동 업데이트

```yaml
# electron-builder.yml
publish:
  provider: github
  repo: yua-desktop
  owner: yuaone
  releaseType: release

# 업데이트 흐름
# 1. 앱 시작 시 GitHub Releases에서 latest 확인
# 2. 새 버전 존재 시 백그라운드 다운로드
# 3. 다운로드 완료 후 사용자에게 알림
# 4. "지금 재시작" 또는 "다음 시작 시 적용" 선택
# 5. 재시작 시 자동 교체 (Squirrel 기반)
```

### 2.6 배포

| 채널 | 형식 | 서명 | 비고 |
|------|------|------|------|
| GitHub Releases | `.dmg` | Apple Developer ID | electron-updater 자동 업데이트 |
| Mac App Store | `.pkg` (Sandbox) | Apple Distribution | Sandbox 제약으로 일부 기능 제한 |
| Platform Hub | 다운로드 링크 | - | platform.yuaone.com/download |

#### 서명 및 공증 (Notarization)

```
필수 인증서:
  1. Apple Developer ID Application — 코드 서명
  2. Apple Developer ID Installer — .pkg 서명 (MAS용)
  3. Apple Distribution — Mac App Store 배포

공증 프로세스:
  1. electron-builder가 빌드 완료
  2. @electron/notarize로 Apple 공증 서버에 업로드
  3. Apple이 맬웨어 스캔 완료 후 티켓 발행
  4. 티켓을 .dmg에 스테이플링
  5. Gatekeeper 통과 보장

환경변수:
  APPLE_ID=dev@yuaone.com
  APPLE_APP_SPECIFIC_PASSWORD=xxxx-xxxx-xxxx-xxxx
  APPLE_TEAM_ID=XXXXXXXXXX
```

### 2.7 패키지 구조

```
yua-desktop/
  package.json
  electron-builder.yml
  src/
    main/                    # Electron main process
      main.ts                # 앱 진입점
      ipc-handlers.ts        # IPC 채널 핸들러
      tray.ts                # 시스템 트레이
      shortcuts.ts           # 글로벌 단축키
      auto-updater.ts        # 자동 업데이트
      deep-link.ts           # yua:// 프로토콜
      file-handler.ts        # 파일 D&D, 로컬 파일 접근
      safe-storage.ts        # 토큰 암호화
    preload/
      preload.ts             # contextBridge API 노출
    renderer/                # yua-web 코드 재사용 (symlink 또는 복사)
      components/            # 공유 컴포넌트
      stores/                # Zustand stores
      hooks/                 # 공유 hooks
      desktop/               # Desktop 전용 컴포넌트
        MiniMode.tsx
        DagDashboard.tsx
        TrayMenu.tsx
  resources/
    icon.icns                # macOS 아이콘
    icon.ico                 # Windows 아이콘
    tray-icon.png            # 트레이 아이콘 (16x16, 32x32)
```

### 2.8 보안 설계

```
Electron 보안 체크리스트:
  [x] contextIsolation: true
  [x] sandbox: true
  [x] nodeIntegration: false
  [x] webSecurity: true
  [x] CSP 헤더 설정 (script-src 'self', connect-src api.yuaone.com)
  [x] safeStorage로 토큰 암호화
  [x] IPC 채널 화이트리스트 (allowedChannels)
  [x] 외부 URL은 shell.openExternal로 처리
  [x] 원격 코드 실행 차단 (remote 모듈 비활성화)
```

---

## 3. Windows Desktop App

### 3.1 동일 Electron 코드베이스

macOS와 동일한 `yua-desktop/` 패키지에서 빌드. electron-builder의 크로스 플랫폼 빌드 지원으로 단일 코드베이스 유지.

```yaml
# electron-builder.yml (Windows 섹션)
win:
  target:
    - target: nsis       # MSI 인스톨러
      arch: [x64, arm64]
  icon: resources/icon.ico
  certificateFile: ./certs/win-ev.pfx
  certificatePassword: ${WIN_CERT_PASSWORD}
  publisherName: "YuaOne Inc."

nsis:
  oneClick: false
  perMachine: true
  allowElevation: true
  createDesktopShortcut: true
  createStartMenuShortcut: true
  shortcutName: "YUA AI"
```

### 3.2 Windows 전용 기능

| 기능 | 설명 |
|------|------|
| System Tray | 작업표시줄 알림 영역 상주, 우클릭 컨텍스트 메뉴 |
| Global Shortcut | `Ctrl+Shift+Y` — 어디서든 YUA 호출 |
| Windows Notification Center | 토스트 알림 (에이전트 완료, 메모리 커밋 등) |
| Jump List | 작업표시줄 우클릭 시 최근 대화/빠른 액션 표시 |

### 3.3 자격 증명 저장 (DPAPI)

```typescript
// Windows에서 safeStorage는 내부적으로 DPAPI(Data Protection API) 사용
// Electron safeStorage API가 OS별로 적절한 메커니즘 자동 선택:
//   macOS  -> Keychain
//   Windows -> DPAPI
//   Linux  -> libsecret (GNOME Keyring / KDE Wallet)

// 추가: Windows Hello 생체 인증 통합 (선택적)
import { systemPreferences } from 'electron';

async function authenticateWithBiometrics(): Promise<boolean> {
  if (process.platform === 'win32') {
    // Windows Hello 지문/안면 인식
    const result = await systemPreferences.promptTouchID(
      'YUA 보안 인증'
    );
    return result;
  }
  return false;
}
```

### 3.4 배포 채널

| 채널 | 형식 | 서명 | 비고 |
|------|------|------|------|
| GitHub Releases | `.exe` (NSIS) | EV Code Signing | SmartScreen 경고 방지 |
| Microsoft Store | `.appx` / `.msix` | Microsoft 파트너 센터 | Phase 2 |
| Platform Hub | 다운로드 링크 | - | platform.yuaone.com/download |

#### EV Code Signing

```
EV(Extended Validation) 인증서 필요:
  - SmartScreen 즉시 신뢰 획득 (OV 인증서는 평판 누적 필요)
  - 하드웨어 토큰(USB) 기반 서명 필수
  - 발급: DigiCert, Sectigo 등 ($300-500/년)

서명 프로세스:
  1. electron-builder 빌드 완료
  2. signtool.exe로 .exe 서명 (EV 인증서 + 타임스탬프)
  3. NSIS 인스톨러 자체도 서명
  4. SmartScreen 필터 즉시 통과
```

### 3.5 Windows Hello 통합

```
선택적 기능 (Settings에서 활성화):
  - 앱 시작 시 Windows Hello 인증 요구
  - 민감 작업(토큰 조회, API 키 표시) 시 재인증
  - WebAuthn API 활용 가능 (renderer에서 navigator.credentials)
```

---

## 4. CLI (npx yuan)

### 4.1 패키지 정보

```json
{
  "name": "@yuaone/yuan",
  "bin": { "yuan": "./dist/cli.js" },
  "engines": { "node": ">=18" },
  "files": ["dist/", "README.md"]
}
```

- 실행 방법: `npx yuan` 또는 `npm install -g @yuaone/yuan` 후 `yuan`
- 언어: TypeScript -> JavaScript (tsc 컴파일)
- 단일 바이너리 옵션: `pkg` 또는 `bun compile`로 Node.js 런타임 포함 빌드

### 4.2 Core 기능

```
Streaming Output:
  - 실시간 토큰 표시 (SSE 기반)
  - Markdown 렌더링 (chalk + marked-terminal)
  - 코드 블록 구문 강조 (highlight.js)

stdin Interrupt:
  - Ctrl+C 1회: graceful stop (현재 스트림 중단, 프롬프트 복귀)
  - Ctrl+C 2회 (1초 내): force exit (프로세스 종료)
  - SIGTERM/SIGINT 핸들링

File Read/Write/Edit:
  - 파일 읽기: 전체 파일 또는 라인 범위
  - 파일 쓰기: 새 파일 생성 또는 전체 덮어쓰기
  - 파일 편집: diff 기반 부분 수정 (search/replace)
  - 권한 확인: 쓰기 전 사용자 확인 프롬프트

Shell Execution:
  - 명령어 실행 + stdout/stderr 캡처
  - 타임아웃 설정 (기본 120초)
  - 위험 명령 경고 (rm -rf, git reset --hard 등)

Diff/Patch Display:
  - unified diff 포맷 (green/red 색상)
  - 변경 전/후 비교 표시
  - 적용 전 사용자 승인

Memory (.yuan/ 디렉토리):
  - .yuan/memory/session/   — 현재 세션 요약
  - .yuan/memory/project/   — 프로젝트 구조, 컨벤션
  - .yuan/memory/recovery/  — 실패 패턴, 자주 깨지는 지점
  - .yuan/memory/artifacts/ — 생성된 계획, DAG, 패치

Error Auto-Fix Loop:
  - 명령 실행 실패 시 자동 원인 분석
  - FailureType 분류: TRANSIENT, TOOL_MISUSE, LOGIC_ERROR, CONTEXT_LOSS, SPEC_MISMATCH
  - 타입별 복구 전략 자동 선택
  - 최대 N회 반복 (기본 3회, --max-retries로 조정)

Agent Spawning & DAG Execution:
  - Governor -> Planner -> Executor[] -> Validator 파이프라인
  - 병렬 Executor 실행 (DAG 의존성 기반)
  - ASCII 진행 표시줄:
    [Agent A] ████████░░ 80%  analyzing...
    [Agent B] ██████████ 100% done
    [Agent C] ░░░░░░░░░░ 0%   waiting (depends: A)
```

### 4.3 Auth Flow

```
방법 1: 브라우저 OAuth
  $ yuan login
  > Opening browser for authentication...
  > Waiting for callback on http://localhost:9876/callback
  > (브라우저에서 Google/GitHub OAuth 완료)
  > Authenticated as user@example.com
  > Token saved to OS keychain

방법 2: API 키 직접 입력
  $ yuan login --token sk-yua-xxxxxxxxxxxx
  > API key validated. Authenticated as user@example.com
  > Token saved to OS keychain

토큰 저장 위치 (OS Keychain):
  macOS  : Keychain Access (service: "yuaone-cli")
  Windows: Windows Credential Manager
  Linux  : libsecret (GNOME Keyring / KDE Wallet)

Fallback: ~/.yuan/auth.json (암호화, keychain 불가 시)
```

### 4.4 Config 체계

```
글로벌 설정: ~/.yuan/config.json
{
  "defaultModel": "standard",
  "fastModel": "fast",
  "theme": "dark",
  "maxRetries": 3,
  "timeout": 120000,
  "autoApprove": false,
  "verbose": false
}

프로젝트 설정: <project-root>/.yuan/config.json
{
  "model": "standard",
  "instructions": "이 프로젝트는 TypeScript monorepo입니다.",
  "allowedTools": ["file_read", "file_write", "shell"],
  "ignorePaths": ["node_modules", ".git", "dist"]
}

Instruction Files:
  - AGENTS.md (프로젝트 루트)
  - .yuan/agents.md
  - 프로젝트별 규칙, 코딩 스타일, 금지사항 등 기술
  - CLAUDE.md와 유사한 역할
```

### 4.5 명령어 체계

```
Interactive Mode:
  $ yuan
  > YUA AI v1.0.0 | Model: standard | Plan: PRO
  > Type your message (Ctrl+C to exit)
  >
  > 이 프로젝트의 구조를 분석해줘
  (스트리밍 응답...)

Single Query Mode:
  $ yuan "이 함수의 버그를 찾아줘"
  (스트리밍 응답 후 종료)

Plan Mode:
  $ yuan --plan "전체 테스트 커버리지를 80%로 올려줘"
  > Plan:
  > 1. 현재 테스트 커버리지 분석 (jest --coverage)
  > 2. 커버리지 낮은 파일 식별
  > 3. 테스트 파일 생성 (3개 병렬)
  > 4. 테스트 실행 및 검증
  >
  > Execute this plan? [y/N]

Fast Mode:
  $ yuan --fast "package.json의 버전을 알려줘"
  (fast 모델 사용, 빠른 응답)

Agent Spawn:
  $ yuan --agent spawn "API 엔드포인트 전체 테스트 작성"
  > Spawning background agent...
  > Agent ID: agt_abc123
  > Use 'yuan status' to monitor progress

기타 명령어:
  $ yuan config                     # 설정 조회/수정
  $ yuan config set defaultModel standard
  $ yuan login                      # 인증
  $ yuan logout                     # 자격 증명 삭제
  $ yuan status                     # 실행 중인 에이전트, 예산, 플랜 정보
  $ yuan memory                     # .yuan/memory/ 관리
  $ yuan memory list                # 저장된 메모리 목록
  $ yuan memory clear session       # 세션 메모리 초기화
```

### 4.6 패키지 구조

```
yua-cli/                             # 모노레포 내 패키지
  package.json
  tsconfig.json
  src/
    cli.ts                           # 진입점 (#!/usr/bin/env node)
    commands/
      index.ts                       # interactive mode
      query.ts                       # single query mode
      login.ts                       # auth flow
      logout.ts                      # credential clear
      config.ts                      # settings management
      status.ts                      # agent/budget status
      memory.ts                      # memory management
    core/
      client.ts                      # YUA API 클라이언트
      stream.ts                      # SSE 스트리밍 핸들러
      auth.ts                        # 토큰 관리 (keychain)
      config-manager.ts              # 설정 로더 (global + project)
    agent/
      governor.ts                    # 전략 결정, 정책 엔진
      planner.ts                     # 작업 분해, DAG 생성
      executor.ts                    # 병렬 실행기
      validator.ts                   # 결과 검증 (structural + semantic)
      recovery.ts                    # Error Recovery Loop
      task-contract.ts               # TaskContract 정의
    tools/
      file-read.ts
      file-write.ts
      file-edit.ts
      shell.ts
      diff.ts
    render/
      markdown.ts                    # 터미널 Markdown 렌더링
      progress.ts                    # ASCII 진행 표시줄
      diff-display.ts               # diff 색상 표시
      spinner.ts                     # 로딩 스피너
    memory/
      memory-manager.ts             # .yuan/ 메모리 관리
      compaction.ts                  # Context Compaction
  dist/                              # 컴파일된 JS
```

---

## 5. Auth Token Architecture

### 5.1 토큰 타입

```
+------------------+----------+------------------+-----------------------------+
| Token Type       | Lifetime | 저장 위치         | 용도                         |
+------------------+----------+------------------+-----------------------------+
| Session Token    | 1h       | Memory / Cookie  | Web/Mobile/Desktop 활성 세션  |
| Refresh Token    | 30d      | Secure Storage   | Session Token 갱신           |
| API Key          | 영구     | DB (SHA-256)     | Platform API 소비자          |
| CLI Token        | 24h      | OS Keychain      | CLI 활동 시 자동 갱신         |
+------------------+----------+------------------+-----------------------------+
```

### 5.2 JWT 구조

```typescript
interface YuaTokenPayload {
  // Standard Claims
  sub: string;           // userId
  iat: number;           // issued at (Unix timestamp)
  exp: number;           // expiration (Unix timestamp — 15분 단위)
  iss: 'yuaone.com';     // issuer
  jti: string;           // JWT ID (revocation용)

  // Immutable Claims (토큰 수명 동안 불변)
  workspaceId: string;
  tokenType: 'session' | 'refresh' | 'cli';
  clientType: 'web' | 'mobile' | 'desktop' | 'cli' | 'api';

  // ⚠️ planId, role은 JWT에 포함하지 않음
  // 이유: mutable claim → plan 변경 시 즉시 반영 불가
  // 대안: 매 요청 시 Redis/DB에서 조회 (캐시 TTL 60초)
}
```

### 5.2.1 Mutable Claims 처리 전략

planId, role 등 변경 가능한 속성은 JWT에 포함하지 않는다.

```
요청 흐름:
  1. JWT에서 sub (userId), workspaceId 추출 (immutable)
  2. Redis 캐시 조회: plan:{userId} → { planId, role, permissions }
     - Cache hit: 사용 (TTL 60초)
     - Cache miss: DB 조회 → Redis에 캐시
  3. Plan 변경 이벤트 발생 시 → Redis 캐시 즉시 무효화

이점:
  - Plan 변경 즉시 반영 (최대 60초 지연)
  - JWT 수명을 15분으로 단축할 필요 없음 (1시간 유지 가능)
  - 토큰 재발급 없이 권한 변경 가능
```

### 5.3 Token Refresh Flow

```
Client                    Backend                     Redis
  |                         |                           |
  |-- Request (JWT) ------->|                           |
  |                         |-- Check blacklist ------->|
  |                         |<-- Not blacklisted -------|
  |                         |-- Verify JWT ------------>|
  |                         |                           |
  |                         |-- exp < now + 5min? ----->|
  |                         |   (Yes: 토큰 만료 임박)     |
  |                         |                           |
  |<-- Response ------------|                           |
  |    + x-token-expiring   |                           |
  |                         |                           |
  |-- POST /auth/refresh -->|                           |
  |   (Refresh Token)       |                           |
  |                         |-- Validate refresh ------>|
  |                         |-- Issue new session ----->|
  |                         |-- Blacklist old token --->|
  |<-- New Session Token ---|                           |
```

자동 갱신 규칙:
- 만료 5분 전: 응답 헤더에 `x-token-expiring: true` 포함
- 클라이언트가 Refresh Token으로 새 Session Token 요청
- 기존 Session Token은 Redis 블랙리스트에 추가 (TTL = 원래 만료까지 남은 시간)
- CLI Token은 활동이 있으면 24시간마다 자동 갱신

### 5.4 Token Revocation

```
취소 메커니즘:
  - Redis Sorted Set: blacklist:{userId}
  - Key: token JTI (JWT ID)
  - Score: 원래 만료 시간 (Unix timestamp)
  - TTL: 원래 만료까지 남은 시간 (메모리 절약)

취소 트리거:
  1. 사용자 로그아웃
  2. 비밀번호 변경 -> 모든 기존 토큰 일괄 취소
  3. 관리자 강제 로그아웃
  4. 의심 활동 감지 (IP 급변, 비정상 요청 패턴)
  5. API Key 삭제/비활성화
```

### 5.5 플랫폼별 토큰 저장

```
Web:
  - Session Token: httpOnly secure cookie (SameSite=Strict)
  - Refresh Token: httpOnly secure cookie (SameSite=Strict, Path=/auth/refresh)

Mobile (React Native):
  - Session Token: SecureStore (Expo) / Keychain (iOS) / Keystore (Android)
  - Refresh Token: 동일

Desktop (Electron):
  - Session Token: safeStorage (DPAPI/Keychain/libsecret)
  - Refresh Token: 동일

CLI:
  - CLI Token: OS Keychain (keytar)
  - Fallback: ~/.yuan/auth.json (AES-256-GCM 암호화, 파일 권한 600)
```

---

## 6. Plan-based Token Separation

### 6.1 플랜별 토큰 예산

```
+-------------+------------------+------------------+------------------+
| Plan        | Per Request      | Per Day (24h)    | Per Billing Cycle|
+-------------+------------------+------------------+------------------+
| FREE        | 20K tokens       | 100K tokens      | 3M tokens/month  |
| PRO         | 72K tokens       | 1M tokens        | 30M tokens/month |
| BUSINESS    | 140K tokens      | 5M tokens        | 150M tokens/month|
| ENTERPRISE  | 240K tokens      | Unlimited        | Custom           |
+-------------+------------------+------------------+------------------+
```

### 6.2 플랜별 모델 접근

```
+-------------+------------------------------------------+
| Plan        | Available Models                         |
+-------------+------------------------------------------+
| FREE        | fast                                     |
| PRO         | standard, fast                           |
| BUSINESS    | All models (standard, fast, coding, reasoning, premium) |
| ENTERPRISE  | All models + priority queue               |
+-------------+------------------------------------------+
```

> 모델명은 추상 tier alias 사용. 실제 매핑: MODEL_REGISTRY (YUA_CORE_ARCHITECTURE.md §6.1) 참조.

### 6.3 Rate Limiting

```
+-------------+-----------+------------+
| Plan        | Per Min   | Per Hour   |
+-------------+-----------+------------+
| FREE        | 10 req    | 100 req    |
| PRO         | 30 req    | 500 req    |
| BUSINESS    | 60 req    | 2,000 req  |
| ENTERPRISE  | 120 req   | Custom     |
+-------------+-----------+------------+

구현:
  - Redis sliding window counter
  - Key: ratelimit:{userId}:{window}
  - 초과 시: HTTP 429 + Retry-After 헤더
  - 클라이언트별 분리 없음 (web/mobile/desktop/cli 합산)
```

### 6.4 Token Usage Tracking

```typescript
interface TokenUsageRecord {
  requestId: string;
  userId: string;
  workspaceId: string;
  planId: string;
  clientType: 'web' | 'mobile' | 'desktop' | 'cli' | 'api';
  model: string;
  timestamp: number;         // Unix ms

  // Per-request breakdown
  inputTokens: number;       // 입력 토큰
  outputTokens: number;      // 출력 토큰
  reasoningTokens: number;   // 추론 토큰 (o1 등)
  toolTokens: number;        // 도구 호출 토큰

  // Cumulative (응답에 포함)
  sessionCumulative: number; // 현재 대화 누적
  dailyCumulative: number;   // 24시간 롤링 누적
  billingCumulative: number; // 이번 결제 주기 누적
}
```

추적 레이어:
- **Per-request**: 요청별 입력/출력/추론/도구 토큰 기록
- **Per-session**: 대화(thread) 단위 누적
- **Per-day**: 24시간 롤링 윈도우 (Redis ZADD)
- **Per-billing-cycle**: 월간 리셋 (PostgreSQL 집계)

### 6.5 플랜별 가격 (2026 기준)

| Plan | 월간 가격 | 주요 포지셔닝 |
|------|----------|-------------|
| FREE | $0 | 체험/개인 캐주얼 |
| PRO | $20/mo | 개인 파워유저 (경쟁사 ChatGPT Plus/Claude Pro 동일가) |
| BUSINESS | $30/mo/seat | 팀/조직 (다중 워크스페이스, 감사 로그) |
| ENTERPRISE | Custom | 전용 인프라, SLA, SSO, 무제한 |

> 참고: PRO $20은 멀티모델 접근(standard+fast) + 월 30M 토큰 기준.
> 원가 추정: 평균 사용자 $8-12/mo → 마진율 40-60%.

---

## 7. 5-Hour Token Usage Window Design

### 7.1 목적

일일 한도와 별개로, 5시간 슬라이딩 윈도우로 burst 사용을 제어한다. 정상적인 사용 스파이크는 허용하되, 자동화 스크립트 등의 남용을 방지한다.

### 7.2 플랜별 5시간 윈도우 한도

```
+-------------+------------------+---------------------+
| Plan        | 5h Window Limit  | Enforcement         |
+-------------+------------------+---------------------+
| FREE        | 200K tokens      | Hard limit (429)    |
| PRO         | 2M tokens        | Hard limit (429)    |
| BUSINESS    | 10M tokens       | Hard limit (429)    |
| ENTERPRISE  | 50M tokens       | Soft limit (alert)  |
+-------------+------------------+---------------------+
```

### 7.3 구현

```typescript
// Redis Sorted Set 기반 슬라이딩 윈도우
const WINDOW_MS = 5 * 60 * 60 * 1000; // 5시간

async function checkAndRecordUsage(
  userId: string,
  tokenCount: number,
  planLimit: number
): Promise<{ allowed: boolean; remaining: number; retryAfter?: number }> {
  const key = `usage_5h:${userId}`;
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  // Pipeline으로 원자적 실행
  const pipeline = redis.pipeline();

  // 1. 윈도우 밖 데이터 제거
  pipeline.zremrangebyscore(key, 0, windowStart);

  // 2. 현재 윈도우 내 총 사용량 조회
  pipeline.zrangebyscore(key, windowStart, now);

  // 3. 새 사용량 기록
  pipeline.zadd(key, now, `${now}:${tokenCount}`);

  // 4. TTL 설정 (5시간 + 여유)
  pipeline.expire(key, 5 * 3600 + 300);

  const results = await pipeline.exec();
  const entries = results[1][1] as string[];

  // 총 사용량 계산
  const currentUsage = entries.reduce((sum, entry) => {
    const tokens = parseInt(entry.split(':')[1], 10);
    return sum + tokens;
  }, 0);

  const totalAfterRequest = currentUsage + tokenCount;

  if (totalAfterRequest > planLimit) {
    // 가장 오래된 항목의 만료 시간 계산
    const oldestTimestamp = entries.length > 0
      ? parseInt(entries[0].split(':')[0], 10)
      : now;
    const retryAfter = Math.ceil(
      (oldestTimestamp + WINDOW_MS - now) / 1000
    );

    return {
      allowed: false,
      remaining: Math.max(0, planLimit - currentUsage),
      retryAfter,
    };
  }

  return {
    allowed: true,
    remaining: planLimit - totalAfterRequest,
  };
}
```

### 7.4 응답 헤더

```
정상 요청:
  x-usage-5h-remaining: 1500000
  x-usage-5h-limit: 2000000
  x-usage-5h-reset: 1709876543    (가장 오래된 항목 만료 Unix timestamp)

80% 초과 경고:
  x-usage-5h-remaining: 300000
  x-usage-5h-limit: 2000000
  x-usage-5h-warning: approaching_limit

한도 초과:
  HTTP 429 Too Many Requests
  Retry-After: 1823                (초 단위)
  Content-Type: application/json
  {
    "error": "USAGE_WINDOW_EXCEEDED",
    "message": "5시간 토큰 사용량 한도를 초과했습니다.",
    "limit": 2000000,
    "used": 2100000,
    "retryAfter": 1823,
    "retryAt": "2026-03-08T15:30:23Z"
  }
```

### 7.5 ENTERPRISE 소프트 리밋

ENTERPRISE 플랜은 hard block 대신 alerting으로 처리:
- 50M 초과 시: Slack webhook + 이메일 알림 (관리자에게)
- 100M 초과 시: 경고 레벨 상향 + 사용자에게 인앱 알림
- 200M 초과 시: 수동 확인 후 계속 사용 가능 (자동 차단 없음)

---

## 8. Backend Integration Points

### 8.1 Auth Middleware

```typescript
// 모든 플랫폼에서 동일한 미들웨어 체인 사용
async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // 1. 토큰 추출 (Bearer 또는 API Key)
  const token = extractToken(req);
  //    - Authorization: Bearer <JWT>
  //    - x-api-key: sk-yua-xxxxx

  // 2. JWT 검증 또는 API Key 해시 조회
  const auth = token.startsWith('sk-yua-')
    ? await validateApiKey(token)      // SHA-256 해시로 DB 조회
    : await validateJwt(token);        // JWT 서명 + 만료 검증

  // 3. Redis 블랙리스트 확인
  if (await isTokenBlacklisted(auth.jti)) {
    return res.status(401).json({ error: 'TOKEN_REVOKED' });
  }

  // 4. 플랜 정보 resolve
  const plan = await resolvePlan(auth.planId);

  // 5. Rate limit 확인
  const rateCheck = await checkRateLimit(auth.userId, plan);
  if (!rateCheck.allowed) {
    res.set('Retry-After', String(rateCheck.retryAfter));
    return res.status(429).json({ error: 'RATE_LIMIT_EXCEEDED' });
  }

  // 6. req에 인증 정보 부착
  req.auth = { ...auth, plan };
  next();
}
```

### 8.2 Usage Tracking Middleware

```typescript
async function usageTrackingMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // 응답 완료 후 토큰 사용량 기록
  const originalEnd = res.end;

  res.end = function (...args: any[]) {
    // 비동기로 usage 기록 (응답 지연 방지)
    setImmediate(async () => {
      const usage = res.locals.tokenUsage;
      if (usage) {
        await Promise.all([
          // 1. PostgreSQL: 영구 기록 (billing용)
          recordUsageToDB(req.auth.userId, usage),
          // 2. Redis: 실시간 카운터 갱신
          updateRollingCounters(req.auth.userId, usage),
          // 3. Redis: 5시간 윈도우 기록
          recordToSlidingWindow(req.auth.userId, usage.totalTokens),
        ]);
      }
    });

    return originalEnd.apply(this, args);
  };

  next();
}
```

### 8.3 Plan Enforcement

```
Pre-check (요청 실행 전):
  1. 모델 접근 권한 확인 (plan -> allowed models)
  2. Per-request 토큰 한도 확인 (max_tokens 파라미터 검증)
  3. 일일 한도 잔여량 확인
  4. 5시간 윈도우 잔여량 확인
  5. Rate limit 확인

Post-check (요청 완료 후):
  1. 실제 사용 토큰 기록
  2. 크레딧 차감 (billing 연동)
  3. 일일/월간 누적 갱신
  4. 한도 임박 시 경고 헤더 삽입
```

### 8.4 Billing 연동

```typescript
// 요청 완료 후 크레딧 차감
async function deductCredits(
  userId: string,
  planId: string,
  usage: TokenUsage
): Promise<void> {
  // 크레딧 계산 (모델별 단가)
  const cost = calculateCost(usage, planId);

  // FREE/PRO: 포함 토큰에서 차감
  // BUSINESS/ENTERPRISE: 포함 토큰 초과 시 추가 과금
  if (cost.exceededIncluded) {
    await chargeOverage(userId, cost.overageAmount);
  }

  // 사용량 기록
  await updateBillingUsage(userId, cost);
}
```

---

## 9. Cross-Platform Code Sharing Strategy

### 9.1 공유 계층

```
yua-shared/                 # 타입/계약 SSOT (전 플랫폼)
  src/
    types/                  # 공유 타입 정의
    contracts/              # API 계약
    billing/                # 플랜/과금 관련 타입
    auth/                   # Auth 관련 타입

yua-web/                    # 원본 UI (Next.js)
  src/
    stores/                 # Zustand stores -> desktop 재사용
    hooks/                  # React hooks -> desktop 재사용
    lib/api/                # API 클라이언트 -> desktop/CLI 재사용
    components/             # UI 컴포넌트 -> desktop 재사용

yua-desktop/                # Electron (macOS + Windows)
  src/
    renderer/               # yua-web 코드 import
    main/                   # Electron-only 코드

yua-cli/                    # CLI (@yuaone/yuan)
  src/
    core/                   # API 클라이언트 (yua-web/lib/api 기반)
    agent/                  # YUAN 오케스트레이터 (CLI 전용)
```

### 9.2 공유 규칙

1. **타입은 yua-shared만**: 플랫폼별 타입 중복 정의 금지
2. **API 클라이언트 로직**: yua-web에서 구현, desktop/cli에서 import
3. **UI 컴포넌트**: yua-web -> yua-desktop 재사용 (Electron renderer)
4. **Auth 로직**: 토큰 관리 코어는 공유, 저장소만 플랫폼별 구현
5. **플랜/과금 로직**: Backend SSOT, 클라이언트는 표시만

---

## 10. Rollout Roadmap

### Phase 1: CLI MVP (4주)

```
Week 1-2:
  - @yuaone/yuan 패키지 스캐폴딩
  - yuan login / logout (OAuth + API Key)
  - yuan "prompt" (Single Query Mode)
  - 스트리밍 출력 + Markdown 렌더링

Week 3-4:
  - yuan interactive mode
  - File read/write/edit tools
  - Shell execution
  - .yuan/ memory 기본 구조
  - npm publish (beta)
```

### Phase 2: Desktop MVP (6주)

```
Week 1-2:
  - yua-desktop/ 스캐폴딩
  - Electron main process (IPC, window)
  - yua-web 컴포넌트 통합
  - 기본 채팅 기능 동작

Week 3-4:
  - System tray + Global shortcut
  - Mini mode
  - File drag & drop
  - safeStorage 토큰 관리

Week 5-6:
  - 자동 업데이트 (electron-updater)
  - macOS 코드 서명 + 공증
  - Windows EV 코드 서명
  - GitHub Releases 배포
```

### Phase 3: Auth/Billing 통합 (3주)

```
Week 1:
  - JWT 발급/검증 미들웨어
  - Refresh token flow
  - Redis 블랙리스트

Week 2:
  - Rate limiting (Redis sliding window)
  - 5시간 윈도우 구현
  - Usage tracking middleware

Week 3:
  - Plan enforcement (pre/post check)
  - Billing 연동 (크레딧 차감)
  - 관리자 대시보드 usage 통계
```

### Phase 4: Agent Runtime (4주)

```
Week 1-2:
  - Governor / Planner / Executor / Validator 구현
  - TaskContract 정의
  - DAG 기반 병렬 실행

Week 3-4:
  - Error Recovery Loop (FailureType 분류)
  - Context Compaction
  - CLI ASCII 진행 표시줄
  - Desktop DAG 시각화 대시보드
```

### Phase 5: 스토어 배포 (2주)

```
Week 1:
  - Mac App Store 제출 (Sandbox 적용)
  - Microsoft Store 제출 (.msix)

Week 2:
  - Platform Hub 다운로드 페이지
  - OS 자동 감지 + 다운로드 버튼
  - 릴리스 노트 페이지
```

---

## 부록 A: 보안 체크리스트

```
전 플랫폼 공통:
  [ ] JWT 서명 알고리즘: RS256 (비대칭)
  [ ] Refresh Token rotation (사용 시 새 RT 발급, 기존 무효화)
  [ ] Token binding (fingerprint 포함으로 토큰 도용 방지)
  [ ] CORS 허용 origin 화이트리스트
  [ ] 입력 유효성 검증 (모든 API 엔드포인트)
  [ ] SQL parameterized queries (이미 적용됨)

Desktop 전용:
  [ ] contextIsolation + sandbox
  [ ] CSP 설정
  [ ] IPC 채널 화이트리스트
  [ ] 자동 업데이트 서명 검증

CLI 전용:
  [ ] OS Keychain 우선, 파일 저장 시 AES-256-GCM
  [ ] 위험 명령 실행 전 사용자 확인
  [ ] --dangerously-skip-confirmation 플래그 (CI 전용)
```

## 부록 B: 환경변수 목록

```
Backend:
  JWT_PRIVATE_KEY          # RS256 서명용 비공개 키
  JWT_PUBLIC_KEY           # RS256 검증용 공개 키
  REDIS_URL                # Redis 연결 (rate limit, blacklist, usage)
  RATE_LIMIT_ENABLED       # Rate limiting 활성화 (default: true)

Desktop:
  APPLE_ID                 # macOS 공증용
  APPLE_APP_SPECIFIC_PASSWORD
  APPLE_TEAM_ID
  WIN_CERT_PASSWORD        # Windows EV 인증서 비밀번호
  GH_TOKEN                 # GitHub Releases 배포용

CLI:
  YUAN_API_URL             # Backend URL (default: https://api.yuaone.com)
  YUAN_MODEL               # 기본 모델 override
  YUAN_DEBUG               # 디버그 로깅 (default: false)
```
