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

---

## 🔄 YUAN 자동화 루프 (허락 없이 자동 진행)

> 이 섹션은 YUAN Coding Agent 구현을 자동으로 진행하기 위한 루프 프로토콜.
> **유저 허락 없이** 구현 → 검토 → 수정 → 빌드 → 다음 태스크로 자동 진행.
> 컨텍스트 소진 시 자동 이어가기 트리거 생성.

### 자동화 모드 활성화 조건
- 유저가 “YUAN 구현 ㄱ”, “자동으로 해”, “알아서 해” 등 자동화 승인 시
- 이 CLAUDE.md가 로드된 상태에서 YUAN 관련 작업 시

### 루프 프로토콜

```
YUAN_AUTO_LOOP:
  1. PLAN — 설계문서 읽기 (docs/YUAN_CODING_AGENT_DESIGN.md)
     → 현재 Phase & 미완료 태스크 파악
     → 의존성 순서대로 태스크 큐 생성

  2. IMPLEMENT — 병렬 에이전트 투입 (최대 3개)
     → 에이전트별 파일 독점 소유 (Harness Engineering)
     → yua-shared 타입 먼저 → yua-backend → yua-web 순서
     → 각 에이전트는 다음을 포함:
       a. 관련 파일 스캔
       b. 코드 작성
       c. TypeScript 컴파일 체크
       d. 기존 코드와 통합 확인

  3. REVIEW — 자동 검토
     → tsc --noEmit (타입 체크)
     → pnpm --filter <pkg> build (빌드 체크)
     → 에이전트 결과 크로스체크 (메인이 서브 결과 검증)
     → 보안 스캔 (시크릿 노출, 인젝션 패턴)

  4. FIX — 자동 수정 루프
     → 빌드/타입 에러 → 에러 메시지 기반 자동 수정
     → 최대 3회 재시도
     → 3회 실패 시 → 문제 기록 후 다음 태스크로

  5. NEXT — 다음 태스크로 이동
     → 완료된 태스크 체크
     → 다음 태스크 자동 시작
     → 모든 태스크 완료 시 → 통합 빌드 테스트

  6. CONTEXT_SAVE — 컨텍스트 소진 시 자동 저장
     → 아래 이어가기 트리거 자동 생성
     → memory/yuan-progress.md에 진행 상황 저장
     → 다음 세션에서 자동 복구
```

### 컨텍스트 소진 시 자동 이어가기

컨텍스트 80% 소진 감지 시:
1. 현재 진행 상황을 `memory/yuan-progress.md`에 저장
2. 이어가기 트리거 메시지 생성:

```
YUAN 자동화 루프 이어가기:

## 진행 상황
- Phase: [현재 Phase]
- 완료: [완료된 태스크 목록]
- 진행 중: [현재 작업 중인 태스크]
- 미완료: [남은 태스크]

## 마지막 상태
- 파일: [수정 중이던 파일]
- 에러: [있다면 에러 내용]
- 빌드: [마지막 빌드 결과]

## 다음 할 일
[구체적 다음 단계]

이 메시지를 새 세션에 붙여넣으면 자동으로 이어갑니다.
CLAUDE.md의 YUAN 자동화 루프 프로토콜을 따라 진행해주세요.
```

### YUAN 구현 태스크 큐 (Phase 1 MVP)

설계문서: `docs/YUAN_CODING_AGENT_DESIGN.md`

```
Phase 1 태스크 순서 (의존성 기반):

Batch 1 — 타입 & 인프라 (yua-shared, yua-backend)
  T1.1: yua-shared/src/agent/tool.types.ts     — 도구 타입 정의 (9개)
  T1.2: yua-shared/src/agent/agent-event.types.ts — SSE 이벤트 타입
  T1.3: yua-shared/src/agent/agent-session.types.ts — 세션 타입
  T1.4: yua-backend/src/agent/tools/tool-registry.ts — 도구 등록/디스패치

Batch 2 — 도구 구현 (yua-backend, 병렬 가능)
  T2.1: tools/file-read.ts
  T2.2: tools/file-write.ts + file-edit.ts
  T2.3: tools/shell-exec.ts (nsjail 격리 포함)
  T2.4: tools/grep.ts + glob.ts
  T2.5: tools/git-ops.ts

Batch 3 — 에이전트 코어 (yua-backend)
  T3.1: agent/agent-loop.ts              — Tool Use Loop 핵심
  T3.2: agent/project-session.ts         — 프로젝트 세션 관리
  T3.3: agent/model-selector.ts          — 멀티모델 라우팅
  T3.4: agent/approval-manager.ts        — 승인 시스템

Batch 4 — 보안 & 스트리밍 (yua-backend)
  T4.1: agent/security/secret-detector.ts — 시크릿 탐지
  T4.2: agent/security/security-scanner.ts — 보안 스캔
  T4.3: agent/stream/agent-stream-emitter.ts — SSE 스트리밍
  T4.4: agent/security/audit-logger.ts    — 감사 로그

Batch 5 — API & 라우터 (yua-backend)
  T5.1: routes/agent-router.ts           — REST API
  T5.2: routes/agent-stream-router.ts    — SSE 엔드포인트
  T5.3: DB migration (agent_sessions, agent_iterations)

Batch 6 — 프론트엔드 (yua-web)
  T6.1: components/agent/AgentPanel.tsx   — 에이전트 실행 패널
  T6.2: components/agent/AgentToolCall.tsx — 도구 호출 표시
  T6.3: components/agent/DiffViewer.tsx   — Diff 뷰어
  T6.4: components/agent/ApprovalDialog.tsx — 승인 다이얼로그
  T6.5: stores/useAgentStore.ts           — 에이전트 상태 관리

검증: 각 Batch 완료 시 빌드 체크 (tsc + pnpm build)
```

### 에이전트 투입 규칙

1. **Harness Engineering**: 에이전트별 파일 독점. 같은 파일 동시 수정 금지.
2. **타입 먼저**: yua-shared 타입 → backend 구현 → web UI 순서.
3. **자동 수정 루프**: 빌드 실패 시 에러 기반 자동 수정 (최대 3회).
4. **체크포인트**: 각 Batch 완료 시 memory/yuan-progress.md 업데이트.
5. **스킵 불가**: CRITICAL 이슈 발견 시 즉시 수정, 넘어가지 않음.

### 관련 문서
- 설계 명세: `docs/YUAN_CODING_AGENT_DESIGN.md`
- 빌링 설계: `docs/YUA_BILLING_TOSS_DESIGN.md`
- 진행 추적: `memory/yuan-progress.md` (자동 생성)
- 백엔드 SSOT: `yua-backend/CLAUDE.md`