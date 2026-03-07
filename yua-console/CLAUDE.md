# yua-console — CLAUDE SSOT

## 절대 규칙
- pnpm 전역 설치 금지 (루트 `packageManager: pnpm@10.26.2` 준수)
- deps 변경: `pnpm --filter yua-console add <dep>`
- 공유 타입/계약은 `yua-shared`에서만 정의

## Stack
- Next.js 15.5.7 (App Router) + React 18.3.1
- Tailwind + Framer Motion
- Monaco Editor (코드 에디터)
- xterm + node-pty (터미널)
- D3 (그래프/시각화)
- SSH2, dockerode (서버 연결)
- MySQL2 + Postgres (DB 직접 접근)
- JWT + bcryptjs (자체 인증)
- Firebase, GCS
- Zustand (상태관리)
- React Markdown + KaTeX + highlight.js

## 역할
YUA ONE 개발자 플랫폼 & 관리 콘솔:
1. **랜딩/마케팅** — AGI-ready 멀티엔진 아키텍처 소개
2. **개발자 콘솔** — 듀얼 셸 (Linux + YUA Shell), SSH 터미널, 파일 탐색, Monaco 에디터, 채팅 플레이그라운드
3. **인스턴스 관리** — VM 모니터링, 로그, 방화벽, 스냅샷
4. **문서 포탈** — SPINE, SDK (Node.js/Python), Chat API, Quickstart, Instances
5. **계정 관리** — 회원가입/로그인 (JWT), API 키 생성, 빌링, 사용량
6. **시각화** — D3 Sankey 다이어그램, 타임라인, 시스템 토폴로지

## Dev/Build
```bash
pnpm --filter yua-console dev
pnpm --filter yua-console build
pnpm --filter yua-console start    # port 3000
pnpm --filter yua-console lint
```

## TS Path Aliases
- `@/*` → `src/*`
- `@components/*`, `@hooks/*`, `@lib/*`, `@console/*`, `@terminal/*`, `@styles/*`, `@types/*`

## API Rewrites (next.config.js)
- `/api/:path*` → `http://127.0.0.1:4000` (메인 API)
- 스트리밍 → port 5000
- SSH → port 5500

## 라우트 구조 (`src/app/`)

| Route | 설명 |
|-------|------|
| `/` | 랜딩/히어로 페이지 |
| `/login` | 로그인 |
| `/signup` | 회원가입 |
| `/overview` | 대시보드 |
| `/console` | 터미널 콘솔 |
| `/chat` | 채팅 플레이그라운드 |
| `/instance` | 인스턴스 관리 |
| `/keys` | API 키 관리 |
| `/billing` | 빌링/구독 |
| `/usage` | 사용량 메트릭 |
| `/models` | 모델 선택/정보 |
| `/projects` | 프로젝트 관리 |
| `/quickstart` | 시작 가이드 |
| `/docs/*` | 문서 (spine, SDK, chat, quickstart, instances) |

## 핵심 디렉토리

### Components (`src/components/`)
- `chat/` — 채팅 UI
- `console/` — 콘솔 UI
- `terminal/` — 터미널 UI
- `instance/` — 인스턴스 관리 UI
- `graph/` — D3 시각화
- `docs/` — 문서 컴포넌트
- `sidebar/` — 네비게이션
- `layout/` — 레이아웃
- `ui/` — 기본 UI

### Console (`src/console/`)
- `linux/` — Linux 셸 구현
- `ssh/` — SSH 터미널 핸들러
- `yua-shell/` — YUA 셸 구현

### Store (`src/store/`) — Zustand
- `useChatStore.ts`, `useChatUIStore.ts`
- `useGraphStore.ts`
- `useMemoryIndicator.ts`
- `useTimelineStore.ts`

### Types (`src/types/`)
- `apikey.ts`, `billing.ts`, `chat.ts`, `console-model.ts`, `message.ts`, `user.ts`

## 참고
- yua-web과 별도 인증 체계 (JWT 기반, Firebase가 아님)
- 콘솔 전용 기능 (터미널, SSH, 인스턴스 관리)이 핵심
- 문서 포탈은 자체 마크다운 렌더링
