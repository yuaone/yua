# YUA Monorepo — CLAUDE SSOT

## 🚨 절대 규칙 (가장 중요)
- **pnpm을 전역(global) 설치/업데이트 하지 마세요.**
  - 이 레포는 `packageManager: pnpm@10.26.2`를 SSOT로 사용합니다.
  - 전역 pnpm 버전으로 작업하면 lockfile/스토어/호환성 이슈로 **빌드·런타임 헬버그**가 납니다.
- **의존성 추가/변경은 반드시 `pnpm add` / `pnpm remove` / `pnpm up`로만 합니다.**
  - `npm install`, `yarn add` 사용 금지.
  - 패키지별로 추가할 때는 `pnpm --filter <pkg> add <dep>`를 사용합니다.

## Repo 구조 (SSOT)
- packages:
  - `yua-web` (Next.js 14 / React 18)
  - `yua-shared` (types/contracts SSOT)
  - `yua-backend`
  - `yua-mobile`
  - `yua-console`

## 패키지 매니저/워크스페이스 (SSOT)
- Workspace: pnpm (`pnpm-workspace.yaml` 기반)
- pnpm 설정:
  - `nodeLinker: isolated`
  - `onlyBuiltDependencies` 설정 존재 (네이티브/빌드 의존성)
- 설치:
  - 루트에서만: `pnpm install`
  - 특정 패키지만: `pnpm --filter <pkg> install` (필요 시)

## 공통 명령어 (SSOT)
- 웹 개발:
  - `pnpm run dev:web`  → `yua-web` dev
  - `pnpm run build:web`
  - `pnpm run lint:web`
- 패키지 직접 실행:
  - `pnpm --filter yua-web dev`
  - `pnpm --filter yua-web build`

## Import/Path 규칙 (SSOT)
- `yua-shared`는 workspace dependency로 연결되며, TS path도 사용합니다.
- `yua-web`의 tsconfig paths:
  - `"@/*" -> "src/*"`
  - `"yua-shared" -> "../yua-shared/src/index.ts"`
  - `"yua-shared/*" -> "../yua-shared/src/*"`
- **규칙:** 공유 타입/계약은 `yua-shared`가 단일 SSOT.  
  다른 패키지에서 계약을 중복 정의하지 마세요.

## 작업 방식 (Claude Code에게)
- 모노레포에서는 항상 **어느 패키지(yua-web/backend/shared/...)를 고치는지** 먼저 명시합니다.
- 변경 전:
  - 관련 파일/흐름을 짧게 스캔하고
  - “어디를 왜 고칠지”를 5줄 내로 계획으로 적고
  - 그 다음 수정합니다.
- 변경 후:
  - 최소한 해당 패키지의 `lint/build/dev` 중 하나를 돌릴 수 있으면 돌리고,
  - 못 돌리면 “왜 못 돌렸는지(환경/권한/시간)”를 남깁니다.

## 환경/런타임 메모
- `yua-web` dev는 `0.0.0.0:3000`으로 뜹니다:
  - `NEXT_DISABLE_SWC_PATCH=1 next dev -H 0.0.0.0 -p 3000`

## 금지사항 (SSOT)
- lockfile을 임의로 재생성하지 마세요.
- “대충 맞겠지”로 타입/계약을 복제하지 마세요 (`yua-shared`가 SSOT).
- 전역 설치/업데이트로 도구 버전 바꾸지 마세요.