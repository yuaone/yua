# YUAN Coding Agent System — 상세 설계 명세서

> **Version:** 1.0.0
> **Date:** 2026-03-08
> **Status:** DRAFT
> **Scope:** 단일 코딩 에이전트 → 병렬 오케스트레이터 → 프로덕션 (3-Phase)
> **참조:** YUA_CORE_ARCHITECTURE.md, YUA_AGENT_TOOL_DESIGN.md, YUA_MULTIPLATFORM_DESIGN.md
> **경쟁사 참조:** Claude Code (Anthropic), Codex CLI (OpenAI), Cursor, Windsurf, Devin

---

## 목차

1. [시스템 개요](#1-시스템-개요)
2. [Phase 1 — 단일 코딩 에이전트](#2-phase-1--단일-코딩-에이전트)
3. [Phase 2 — 병렬 에이전트 오케스트레이션](#3-phase-2--병렬-에이전트-오케스트레이션)
4. [Phase 3 — 프로덕션 & 보안](#4-phase-3--프로덕션--보안)
5. [Tool System 상세](#5-tool-system-상세)
6. [Agentic Loop 아키텍처](#6-agentic-loop-아키텍처)
7. [Context Window 관리](#7-context-window-관리)
8. [플랜별 실행 정책](#8-플랜별-실행-정책)
9. [YUA SDK 연동](#9-yua-sdk-연동)
10. [프론트엔드 UI 설계](#10-프론트엔드-ui-설계)
11. [비용 모델 & 마진 설계](#11-비용-모델--마진-설계)
12. [차별화 전략](#12-차별화-전략)
13. [DB 스키마](#13-db-스키마)
14. [API 엔드포인트](#14-api-엔드포인트)
15. [외부 사용 방식 (자동화 도구)](#15-외부-사용-방식-자동화-도구)
16. [롤아웃 로드맵](#16-롤아웃-로드맵)

---

## 1. 시스템 개요

### 1.1 비전

YUAN Coding Agent는 Claude Code / Codex CLI와 동급의 자율 코딩 에이전트를,
**클라우드 기반 웹/데스크톱/모바일/CLI** 환경에서 제공한다.

핵심 차별점:
- **클라우드 네이티브**: 설치 불필요, 브라우저에서 바로 사용
- **멀티모델**: 작업 특성별 최적 모델 자동 선택 (Claude=코딩, GPT=검색, Gemini=분석)
- **병렬 DAG**: 독립 파일은 동시 작업, 의존 파일은 순차 처리
- **팀 공유**: 워크스페이스 기반 — 팀원이 에이전트 작업 실시간 관찰/개입
- **SDK 연동**: `@yuaone/yuan-sdk`로 외부 앱에서 코딩 에이전트 API 호출

### 1.2 실행 모드

```
+------------------+-----------------------------------+---------------------+
| 모드             | 설명                              | 트리거              |
+------------------+-----------------------------------+---------------------+
| Chat Mode        | 대화형 코딩 질문/응답              | 일반 메시지          |
| Agent Mode       | 자율 파일 읽기/쓰기/실행           | /code, /fix, /refactor |
| Parallel Mode    | 다중 에이전트 DAG 병렬 실행        | 대규모 작업 자동 분류  |
| Review Mode      | 코드 리뷰 + 개선 제안              | /review              |
| Debug Mode       | 에러 추적 + 자동 수정              | /debug               |
+------------------+-----------------------------------+---------------------+
```

### 1.3 전체 아키텍처

```
User (Web/Desktop/Mobile/CLI/SDK)
  |
  v
YUA Backend (Express)
  |
  +-- /api/agent/run        → Agent Runner (Phase 1)
  +-- /api/agent/dag        → DAG Orchestrator (Phase 2)
  +-- /api/agent/stream     → SSE 실시간 스트리밍
  |
  v
+--------------------------------------------------+
|              Agent Execution Layer                |
|                                                  |
|  Governor → Planner → Executor(s) → Validator    |
|                                                  |
|  Tools:                                          |
|  file_read, file_write, file_edit, shell_exec,   |
|  grep, glob, git_ops, code_search, test_run      |
|                                                  |
|  Sandbox: Docker / gVisor (Phase 3)              |
+--------------------------------------------------+
  |
  v
Project Storage (Git repo clone per session)
```

---

## 2. Phase 1 — 단일 코딩 에이전트

### 2.1 목표

- 단일 LLM + Tool Use Loop로 자율 코딩
- 유저 프로젝트를 서버에 클론 → 파일 읽기/쓰기/실행
- 결과를 diff/patch로 반환
- 기존 yua-backend에 라우터 추가로 구현

### 2.2 Tool Use Loop (핵심)

```typescript
// yua-backend/src/agent/agent-loop.ts

interface AgentLoopConfig {
  model: ModelTier;                    // "standard" | "coding" | "fast"
  maxIterations: number;               // 최대 루프 반복 (기본 25, 플랜별 차등)
  maxTokensPerIteration: number;       // 반복당 토큰 한도
  totalTokenBudget: number;            // 전체 토큰 예산
  tools: ToolDefinition[];             // 사용 가능한 도구 목록
  systemPrompt: string;                // 시스템 프롬프트
  projectPath: string;                 // 프로젝트 루트 경로
  sandboxId?: string;                  // Docker 컨테이너 ID (Phase 3)
}

interface AgentIteration {
  index: number;
  role: "assistant";
  content: string | null;              // LLM 텍스트 응답 (있으면)
  toolCalls: ToolCall[];               // 도구 호출 목록
  toolResults: ToolResult[];           // 도구 실행 결과
  tokensUsed: { input: number; output: number; reasoning: number };
  durationMs: number;
}

type AgentTermination =
  | { reason: "GOAL_ACHIEVED"; summary: string }
  | { reason: "MAX_ITERATIONS"; lastState: string }
  | { reason: "BUDGET_EXHAUSTED"; tokensUsed: number }
  | { reason: "USER_CANCELLED" }
  | { reason: "ERROR"; error: string }
  | { reason: "NEEDS_APPROVAL"; action: PendingAction };
```

### 2.3 Loop 실행 흐름

```
User Message: "이 프로젝트에서 모든 console.log를 제거해줘"
  |
  v
[Iteration 1] LLM 분석
  → tool_call: glob({ pattern: "**/*.{ts,tsx,js,jsx}" })
  → result: [src/a.ts, src/b.ts, src/c.ts, ...]
  |
[Iteration 2] LLM: 파일 탐색
  → tool_call: grep({ pattern: "console\\.log", path: "src/" })
  → result: [{file: "src/a.ts", line: 15, ...}, ...]
  |
[Iteration 3] LLM: 수정 시작
  → tool_call: file_edit({ path: "src/a.ts", old: "console.log(...)", new: "" })
  → tool_call: file_edit({ path: "src/b.ts", old: "console.log(...)", new: "" })
  → result: [OK, OK]
  |
[Iteration 4] LLM: 검증
  → tool_call: shell_exec({ command: "npx tsc --noEmit" })
  → result: { exitCode: 0, stdout: "" }
  |
[Iteration 5] LLM: 완료
  → content: "총 12개 파일에서 47개의 console.log를 제거했습니다. TypeScript 컴파일 확인 완료."
  → termination: GOAL_ACHIEVED
```

### 2.4 프로젝트 세션 관리

```typescript
// yua-backend/src/agent/project-session.ts

interface ProjectSession {
  id: string;                          // UUID
  userId: number;
  workspaceId: string;
  threadId: number;                    // 채팅 스레드 연결

  // 프로젝트 소스
  source:
    | { type: "git"; repoUrl: string; branch: string; commitHash: string }
    | { type: "upload"; files: UploadedFile[] }
    | { type: "workspace"; projectId: string };   // YUA 프로젝트 내장

  // 서버 로컬 경로
  workDir: string;                     // /tmp/yuan-sessions/{sessionId}/

  // 상태
  status: "initializing" | "ready" | "running" | "completed" | "error";
  createdAt: number;
  lastActiveAt: number;
  ttlMs: number;                       // 세션 만료 (기본 30분 비활성)

  // 변경 추적
  changedFiles: string[];              // 수정된 파일 목록
  diffSummary?: string;                // git diff 요약
}
```

### 2.5 프로젝트 초기화 흐름

```
1. 유저가 Git repo URL 입력 (또는 파일 업로드 / YUA 프로젝트 선택)
2. 서버에서 shallow clone (depth=1) → /tmp/yuan-sessions/{sessionId}/
3. .gitignore 기반 파일 인덱싱
4. 프로젝트 구조 분석 (package.json, tsconfig, etc.)
5. 시스템 프롬프트에 프로젝트 컨텍스트 주입
6. Agent Loop 시작 대기
```

```typescript
async function initProjectSession(config: {
  userId: number;
  repoUrl: string;
  branch?: string;
}): Promise<ProjectSession> {
  const sessionId = crypto.randomUUID();
  const workDir = `/tmp/yuan-sessions/${sessionId}`;

  // 보안: URL/branch 인젝션 방지
  function validateGitUrl(url: string): boolean {
    const SAFE_URL = /^https?:\/\/[a-zA-Z0-9._\-]+\.[a-zA-Z]{2,}(\/[a-zA-Z0-9._\-/]+)?(\.git)?$/;
    return SAFE_URL.test(url);
  }

  function validateBranch(branch: string): boolean {
    const SAFE_BRANCH = /^[a-zA-Z0-9._\-/]+$/;
    return SAFE_BRANCH.test(branch) && !branch.includes('..');
  }

  if (!validateGitUrl(config.repoUrl)) {
    throw new Error(`Invalid git URL: ${config.repoUrl}`);
  }
  if (config.branch && !validateBranch(config.branch)) {
    throw new Error(`Invalid branch name: ${config.branch}`);
  }

  // execAsync → execFile로 변경 (쉘 해석 방지)
  await execFileAsync('git', [
    'clone', '--depth', '1', '--branch', config.branch ?? 'main',
    config.repoUrl, workDir
  ], { timeout: 60_000 });

  // 프로젝트 구조 분석
  const structure = await analyzeProjectStructure(workDir);

  return {
    id: sessionId,
    userId: config.userId,
    workDir,
    status: "ready",
    source: { type: "git", repoUrl: config.repoUrl, branch: config.branch ?? "main", commitHash: "" },
    // ...
  };
}
```

### 2.6 시스템 프롬프트 구성

```typescript
function buildCodingSystemPrompt(session: ProjectSession, structure: ProjectStructure): string {
  return `
You are YUAN, an expert AI coding agent. You have full access to the user's project.

## Project Context
- Language: ${structure.primaryLanguage}
- Framework: ${structure.framework}
- Package Manager: ${structure.packageManager}
- Entry Point: ${structure.entryPoint}
- Total Files: ${structure.fileCount}

## Project Structure
${structure.treeView}  // 디렉토리 트리 (depth 3)

## Available Tools
You can use the following tools to explore and modify the project:
- file_read: Read file contents
- file_write: Create or overwrite a file
- file_edit: Make targeted edits (find & replace)
- shell_exec: Run shell commands (build, test, lint)
- grep: Search file contents with regex
- glob: Find files by pattern
- git_ops: Git operations (status, diff, commit)
- code_search: Semantic code search (AST-aware)
- test_run: Run tests and return results

## Rules
1. Always read a file before editing it
2. Make minimal, focused changes — don't refactor unnecessarily
3. Run tests/build after changes to verify correctness
4. If a change might break other files, check dependencies first
5. Ask for user approval before destructive operations (delete, overwrite)
6. Keep the user informed of progress with brief status updates
`.trim();
}
```

### 2.7 Phase 1 최소 보안 격리

Phase 3의 Docker/gVisor 전에도, Phase 1부터 최소한의 격리를 적용한다:

1. **nsjail 경량 샌드박스** — 모든 shell_exec을 nsjail 내에서 실행
   - 네임스페이스 격리 (PID, NET, MNT)
   - cgroup 리소스 제한 (CPU 1core, MEM 512MB, 30초 타임아웃)
   - 파일시스템: 프로젝트 디렉토리만 쓰기, 나머지 읽기 전용
   - 네트워크: 기본 차단

2. **명령어 Allowlist (Phase 1 서브셋)**
   - 빌드: npm, npx, pnpm, yarn, pip, cargo, go, make
   - 테스트: jest, vitest, pytest, go test, cargo test
   - 린트: eslint, prettier, tsc, mypy
   - git: status, diff, log, add, commit (push 제외)
   - 시스템: ls, cat, head, tail, wc, find, grep, which
   - 차단: curl, wget, ssh, sudo, docker, rm -rf, dd, mkfs

3. **execFile 사용 의무화**
   - 모든 외부 명령 실행은 execAsync(쉘) 대신 execFileAsync(직접 실행)
   - 쉘 해석을 거치지 않으므로 인젝션 원천 차단

### 2.8 서버 크래시 복구 (Crash Recovery)

에이전트 실행 중 서버가 크래시하거나 재시작되면:

1. **체크포인트 저장**: 매 iteration 완료 시 DB에 체크포인트 저장
   - `agent_iterations` 테이블에 이미 기록
   - 추가: `agent_sessions.last_checkpoint_at`, `agent_sessions.checkpoint_data JSONB`

2. **크래시 감지**: 서버 시작 시 `status = 'running'` 세션 검색
   - `running` 상태인데 `last_checkpoint_at`이 5분 이상 전이면 크래시로 판단

3. **복구 전략**:
   a. 단일 에이전트: 마지막 체크포인트에서 재개 (대화 이력 복원)
   b. DAG 병렬: 완료된 태스크는 유지, 진행 중이던 태스크만 재실행
   c. 복구 불가 시: 유저에게 알림 + 변경 파일 diff 제공

4. **프로젝트 파일 보존**: `/tmp` 대신 영구 스토리지 사용
   - 개발: `/var/yuan-sessions/` (서버 로컬 SSD)
   - 프로덕션: EBS/NFS 마운트
   - 세션 TTL 만료 시 cron으로 정리

---

## 3. Phase 2 — 병렬 에이전트 오케스트레이션

### 3.1 목표

- 대규모 작업을 파일/모듈 단위로 분해
- 독립 파일은 병렬 에이전트로 동시 처리
- 파일 의존관계 분석 → DAG 생성
- 충돌 감지 & 자동 해결

### 3.2 Governor 분류 로직

```typescript
// yua-backend/src/agent/governor.ts

type TaskComplexity = "simple" | "moderate" | "complex" | "massive";

interface GovernorDecision {
  complexity: TaskComplexity;
  mode: "single" | "parallel";
  plan: AgentPlan;
}

interface AgentPlan {
  tasks: PlannedTask[];
  dependencies: [string, string][];    // [from, to] 의존 관계
  estimatedTokens: number;
  estimatedDurationMs: number;
  maxParallelAgents: number;
}

interface PlannedTask {
  id: string;
  goal: string;                        // 자연어 목표
  targetFiles: string[];               // 작업 대상 파일
  readFiles: string[];                 // 참조만 하는 파일
  tools: string[];                     // 필요한 도구
  estimatedIterations: number;
  priority: number;                    // 0(낮음) ~ 10(높음)
}
```

### 3.3 파일 의존관계 분석

```typescript
// yua-backend/src/agent/dependency-analyzer.ts

interface FileDependencyGraph {
  nodes: Map<string, FileNode>;
  edges: Map<string, string[]>;        // file → [imports...]
}

interface FileNode {
  path: string;
  language: string;
  exports: string[];                   // export된 심볼
  imports: ImportRef[];                // import하는 심볼
  complexity: number;                  // 순환 복잡도 추정
}

interface ImportRef {
  source: string;                      // import 경로
  symbols: string[];                   // import된 심볼
  isTypeOnly: boolean;                 // type-only import
}

/**
 * TypeScript/JavaScript 프로젝트의 import 그래프를 분석하여
 * 어떤 파일이 독립적으로 수정 가능하고,
 * 어떤 파일이 함께 수정되어야 하는지 결정한다.
 */
async function analyzeFileDependencies(projectPath: string): Promise<FileDependencyGraph> {
  // 1. 모든 TS/JS 파일 수집
  // 2. AST 파싱으로 import/export 추출
  // 3. 그래프 구성
  // 4. Strongly Connected Components 찾기 (순환 의존)
  // 5. 독립 수정 가능 파일 그룹 분류
}
```

### 3.4 병렬 실행 엔진

```typescript
// yua-backend/src/agent/parallel-executor.ts

interface ParallelExecutionState {
  dagId: string;
  tasks: Map<string, TaskState>;
  completedTasks: string[];
  runningTasks: string[];
  pendingTasks: string[];
  failedTasks: string[];

  // 예산 추적
  totalTokensUsed: number;
  totalTokenBudget: number;
  wallTimeMs: number;
  wallTimeLimit: number;
}

type TaskState =
  | { status: "pending" }
  | { status: "blocked"; waitingFor: string[] }
  | { status: "running"; agentId: string; iteration: number }
  | { status: "completed"; result: AgentResult; tokensUsed: number }
  | { status: "failed"; error: string; retryCount: number }
  | { status: "skipped"; reason: string };

// 기존 Promise.race → 이벤트 기반 완료 처리로 변경

async function executeDAG(plan: AgentPlan, session: ProjectSession): Promise<DAGResult> {
  const state: ParallelExecutionState = initState(plan);

  while (hasPendingWork(state)) {
    const runnableTasks = findRunnableTasks(state);

    // 새 에이전트 시작 (이미 실행 중인 것 제외)
    for (const task of runnableTasks.slice(0, maxParallelAgents - state.runningTasks.length)) {
      const agent = spawnAgent(task, session);

      // 각 에이전트에 개별 완료 핸들러 등록 (유실 방지)
      agent.then(result => completionQueue.push(result))
           .catch(err => completionQueue.push({ status: "failed", error: err, taskId: task.id }));

      state.runningTasks.push(task.id);
    }

    // 완료된 에이전트가 있을 때까지 대기 (polling 대신 이벤트)
    const completed = await completionQueue.shift();  // blocking dequeue

    // 모든 완료된 결과 일괄 처리 (동시에 여러 개 완료 가능)
    const batch = [completed, ...completionQueue.drain()];

    for (const result of batch) {
      if (result.status === "completed") {
        const conflicts = detectFileConflicts(result, state);
        if (conflicts.length > 0) {
          await resolveConflicts(conflicts, session);
        }
        updateState(state, result);
      } else if (result.status === "failed") {
        // 재시도 전략: 최대 2회, 다른 모델로 전환 가능
        if (result.retryCount < 2) {
          const retryTask = { ...getTask(result.taskId), retryCount: result.retryCount + 1 };
          state.pendingTasks.push(retryTask);
        } else {
          handleFinalFailure(state, result);
        }
      }
    }

    emitDAGProgress(state);
  }

  return buildDAGResult(state);
}
```

### 3.5 충돌 감지 & 해결

```typescript
// yua-backend/src/agent/conflict-resolver.ts

type ConflictType =
  | "SAME_FILE_EDIT"           // 같은 파일을 2개 에이전트가 수정
  | "IMPORT_BREAK"             // A가 수정한 export를 B가 사용
  | "TYPE_MISMATCH"            // 인터페이스 변경으로 타입 불일치
  | "TEST_REGRESSION";         // 변경 후 기존 테스트 실패

interface FileConflict {
  type: ConflictType;
  fileA: { path: string; agentId: string; diff: string };
  fileB: { path: string; agentId: string; diff: string };
  severity: "low" | "medium" | "high" | "critical";
}

type ConflictResolution =
  | { strategy: "AUTO_MERGE"; mergedDiff: string }        // 3-way merge 성공
  | { strategy: "PRIORITY"; winner: string }               // 우선순위 높은 에이전트 채택
  | { strategy: "RE_RUN"; taskId: string }                 // 패배 에이전트 재실행 (최신 상태로)
  | { strategy: "USER_APPROVAL"; options: string[] };      // 유저에게 선택 요청

async function resolveConflicts(
  conflicts: FileConflict[],
  session: ProjectSession
): Promise<ConflictResolution[]> {
  const resolutions: ConflictResolution[] = [];

  for (const conflict of conflicts) {
    switch (conflict.type) {
      case "SAME_FILE_EDIT": {
        // 3-way merge 시도
        const mergeResult = await threeWayMerge(
          conflict.fileA.diff,
          conflict.fileB.diff,
          await readOriginal(conflict.fileA.path, session)
        );

        if (mergeResult.success) {
          resolutions.push({ strategy: "AUTO_MERGE", mergedDiff: mergeResult.merged });
        } else {
          // merge 실패 → 유저 승인 요청
          resolutions.push({
            strategy: "USER_APPROVAL",
            options: [conflict.fileA.diff, conflict.fileB.diff, mergeResult.partial]
          });
        }
        break;
      }

      case "IMPORT_BREAK":
      case "TYPE_MISMATCH": {
        // 영향받는 에이전트를 최신 상태로 재실행
        resolutions.push({ strategy: "RE_RUN", taskId: conflict.fileB.agentId });
        break;
      }

      case "TEST_REGRESSION": {
        // 테스트 실패 원인 파일의 에이전트 재실행
        resolutions.push({ strategy: "RE_RUN", taskId: conflict.fileA.agentId });
        break;
      }
    }
  }

  return resolutions;
}
```

### 3.6 서브 에이전트 생성 및 맥락 전달

#### 3.6.1 Spawn 프로토콜

서브 에이전트는 독립된 LLM 세션으로 생성된다:

1. Governor가 AgentPlan 생성 → PlannedTask[] 배열
2. 각 PlannedTask마다 spawnAgent() 호출
3. 서브 에이전트별 독립 LLM 세션 (별도 conversation history)
4. 공유 자원: 프로젝트 파일시스템 (git worktree로 격리)

Lifecycle:
  SPAWN → INIT (프로젝트 분석) → EXECUTE (tool loop) → VALIDATE → REPORT → CLEANUP

#### 3.6.2 역할(Role) 부여

각 서브 에이전트는 **역할 특화 시스템 프롬프트**를 받는다:

```typescript
function buildSubAgentPrompt(task: PlannedTask, dagContext: DAGContext): string {
  return `
You are a YUAN Sub-Agent. Your role: ${task.goal}

## Your Scope
- Target files (WRITE): ${task.targetFiles.join(', ')}
- Reference files (READ-ONLY): ${task.readFiles.join(', ')}
- DO NOT modify files outside your target scope.

## Overall Mission
${dagContext.overallGoal}

## DAG Context
- Total tasks: ${dagContext.totalTasks}
- Your task ID: ${task.id} (priority: ${task.priority})
- Dependencies completed: ${dagContext.completedTasks.map(t => t.summary).join('\n')}
- Parallel siblings: ${dagContext.runningTasks.join(', ')}

## Constraints
- Max iterations: ${task.estimatedIterations * 1.5}
- When done, provide a structured summary of all changes made.
- If you encounter an issue outside your scope, report it — don't fix it.
`.trim();
}
```

#### 3.6.3 맥락(Context) 전달

메인 → 서브 에이전트에 전달되는 컨텍스트:

```typescript
interface SubAgentContext {
  // 필수 (항상 전달)
  overallGoal: string;                    // DAG 전체 목표
  taskGoal: string;                       // 이 서브 에이전트의 목표
  targetFiles: string[];                  // 수정 대상 파일
  readFiles: string[];                    // 참조용 파일
  projectStructure: string;               // 디렉토리 트리 (depth 2)

  // 조건부 (의존성 있을 때)
  dependencyResults?: {                   // 선행 태스크 결과
    taskId: string;
    summary: string;
    changedFiles: { path: string; diff: string }[];
  }[];

  // 선택적 (토큰 예산 여유 시)
  relevantFileContents?: {                // 핵심 파일 내용 미리 로드
    path: string;
    content: string;
  }[];

  // 주의사항
  warnings?: string[];                    // "이 파일은 다른 에이전트도 참조 중"
}

// 토큰 최적화:
// - 전체 대화 이력은 전달하지 않음 (서브 에이전트는 fresh start)
// - dependencyResults는 diff 요약만 (전체 diff X)
// - relevantFileContents는 토큰 예산의 30% 이내
```

#### 3.6.4 결과 병합 전략

서브 에이전트 결과를 최종 결과로 합치는 과정:

1. 완료 순서대로 결과 수집
2. 파일 충돌 감지 (3.5의 ConflictResolver)
3. 충돌 없으면 → 단순 merge (각 에이전트의 변경사항 적용)
4. 충돌 있으면 → 3-way merge 시도 → 실패 시 Governor가 판단
5. 전체 merge 후 → 통합 검증:
   a. tsc --noEmit (타입 체크)
   b. 테스트 실행
   c. 보안 스캔 (4.0.5)
6. 검증 실패 시 → 자동 수정 루프 (메인 에이전트가 직접 수정)
7. 최종 결과를 unified diff로 유저에게 표시

#### 3.6.5 서브 에이전트 실패 대응

| 실패 유형 | 1차 대응 | 2차 대응 | 3차 대응 |
|-----------|---------|---------|---------|
| 빌드 에러 | 에러 메시지 포함하여 재시도 | 다른 모델로 재시도 | Governor에게 에스컬레이션 |
| 타임아웃 | 토큰 예산 50% 추가하여 재시도 | 태스크를 2개로 분할 | 유저에게 알림 |
| 충돌 발생 | 최신 파일 상태로 재시도 | Governor가 직접 수정 | 유저 승인 요청 |
| 범위 이탈 | 경고 후 범위 내 작업만 유지 | 새 서브 에이전트 생성 | - |
| 반복 실패 | 전체 DAG 일시 중지 | 유저에게 상황 보고 | 부분 결과 제공 |

재시도 예산: 원래 토큰 예산의 최대 200%까지
전체 DAG 실패 임계치: 태스크의 30% 이상 실패 시 전체 중단

---

## 4. Phase 3 — 프로덕션 & 보안

### 4.0 보안 & 시큐리티 (Claude Code Security 벤치마크)

> **배경:** 2026.02.20 Anthropic이 Claude Code Security를 발표하며 CrowdStrike(-8%), Cloudflare(-8.1%), JFrog(-25%) 등
> 사이버보안 주가가 폭락. S&P 소프트웨어 지수 6일간 $8,300억 증발.
> 기존 SAST/DAST 도구가 "패턴 매칭"인 반면, Claude Opus 4.6은 **코드를 추론**하여 500+ 제로데이를 발견.
> YUAN은 이 수준의 보안 스캐닝을 에이전트에 내장하여 차별화한다.

#### 4.0.1 YUAN Security Scanner (핵심 차별화)

```typescript
// yua-backend/src/agent/security/security-scanner.ts

interface SecurityScanConfig {
  mode: "quick" | "deep" | "audit";      // quick=OWASP Top10, deep=로직결함, audit=컴플라이언스
  scope: "changed" | "full";              // 변경 파일만 vs 전체 코드베이스
  rules: SecurityRule[];                  // 커스텀 보안 규칙
  autoFix: boolean;                       // 자동 패치 제안 여부
}

interface SecurityFinding {
  id: string;
  severity: "critical" | "high" | "medium" | "low" | "info";
  category: SecurityCategory;
  file: string;
  startLine: number;
  endLine: number;
  title: string;                          // "SQL Injection in user query"
  description: string;                    // 추론 기반 상세 설명
  cweId?: string;                         // CWE-89, CWE-79, ...
  owaspCategory?: string;                 // A01:2021, A03:2021, ...
  suggestedFix?: {
    diff: string;                         // 패치 diff
    confidence: number;                   // 0.0~1.0
    explanation: string;
  };
  falsePositiveScore: number;             // 0.0~1.0 (멀티스테이지 검증 결과)
}

type SecurityCategory =
  | "INJECTION"                           // SQL, NoSQL, Command, LDAP
  | "AUTH_BYPASS"                         // 인증 우회
  | "BROKEN_ACCESS"                       // 권한 상승, IDOR
  | "CRYPTO_FAILURE"                      // 약한 암호화, 하드코딩 키
  | "SSRF"                                // 서버사이드 요청 위조
  | "XSS"                                 // Cross-Site Scripting
  | "INSECURE_DESERIALIZATION"
  | "LOGIC_FLAW"                          // 비즈니스 로직 결함 (Claude Code Security 핵심)
  | "SECRET_EXPOSURE"                     // API키, 토큰, 비밀번호 노출
  | "DEPENDENCY_VULN"                     // 의존성 취약점
  | "RACE_CONDITION"
  | "MEMORY_CORRUPTION";

// 슬래시 커맨드로 트리거
// /security-scan          → quick 모드 (변경 파일)
// /security-scan --deep   → deep 모드 (전체 코드베이스)
// /security-audit          → audit 모드 (컴플라이언스 리포트 생성)
```

#### 4.0.2 OWASP LLM Top 10 대응

| # | 취약점 | YUAN 대응 |
|---|--------|----------|
| LLM01 | **Prompt Injection** (직접/간접) | 시스템 프롬프트 격리, 입력 검증 레이어, 프롬프트 가드 모델 |
| LLM02 | **Sensitive Information Disclosure** | 출력 필터링, PII 감지/마스킹, 시크릿 스캔 |
| LLM03 | **Supply Chain Vulnerabilities** | 의존성 자동 감사 (npm audit/pip audit), SBOM 생성 |
| LLM04 | **Data and Model Poisoning** | 모델 무결성 해시, 학습 데이터 검증 |
| LLM05 | **Insecure Output Handling** | AI 출력 코드 샌드박싱, 자동 SAST 스캔 |
| LLM06 | **Excessive Agency** | 도구 호출 최소 권한, 승인 게이트, 실행 범위 제한 |
| LLM07 | **System Prompt Leakage** | 시스템 프롬프트 난독화, 추출 시도 감지 |
| LLM08 | **Vector and Embedding Weaknesses** | RAG 입력 검증, 임베딩 접근제어 |
| LLM09 | **Misinformation** | 코드 정확도 검증, 자동 테스트/빌드 연동 |
| LLM10 | **Unbounded Consumption** | 토큰/요청 레이트 리밋, RequestBudget, credit-check |

#### 4.0.3 시크릿 & 민감정보 탐지 (강화)

```typescript
// yua-backend/src/agent/security/secret-detector.ts

interface SecretDetectorConfig {
  // 패턴 매칭 (1차)
  patterns: RegExp[];
  // LLM 추론 (2차) — 패턴 못 잡는 하드코딩 시크릿 탐지
  llmAnalysis: boolean;
  // 엔트로피 분석 (3차) — 높은 엔트로피 문자열 = 잠재 시크릿
  entropyThreshold: number;              // 기본 4.5 bits/char
}

const SECRET_PATTERNS = [
  // API Keys
  /(?:api[_-]?key|apikey)\s*[:=]\s*['"]?([A-Za-z0-9_\-]{20,})['"]?/i,
  // AWS
  /AKIA[0-9A-Z]{16}/,
  /(?:aws[_-]?secret|secret[_-]?key)\s*[:=]\s*['"]?([A-Za-z0-9/+=]{40})['"]?/i,
  // Firebase / Google
  /AIza[0-9A-Za-z\-_]{35}/,
  // JWT
  /eyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*/,
  // Private Keys
  /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----/,
  // 한국 개인정보 (PIPA 대응)
  /\d{6}[-]\d{7}/,                       // 주민등록번호
  /\d{3}[-]\d{2}[-]\d{5}/,              // 사업자등록번호
  // 토스/PG 키
  /(?:test_|live_)(?:ck|sk)_[A-Za-z0-9]{20,}/,
  // npm/PyPI 토큰
  /npm_[A-Za-z0-9]{36}/,
  /pypi-[A-Za-z0-9_-]{100,}/,
];

// DLP (Data Loss Prevention)
// AI 응답에 시크릿이 포함되면 자동 마스킹
function sanitizeOutput(output: string): string {
  let sanitized = output;
  for (const pattern of SECRET_PATTERNS) {
    sanitized = sanitized.replace(pattern, "[REDACTED]");
  }
  return sanitized;
}
```

#### 4.0.4 에이전트 감사 추적 (Audit Trail)

```typescript
// yua-backend/src/agent/security/audit-logger.ts

interface AgentAuditLog {
  id: string;                             // UUID
  timestamp: number;
  sessionId: string;
  userId: number;
  workspaceId: string;

  // 행위
  action: AuditAction;
  tool?: string;                          // 사용된 도구
  targetFile?: string;                    // 대상 파일
  command?: string;                       // 실행된 명령

  // 컨텍스트
  input?: string;                         // 도구 입력 (민감정보 마스킹)
  output?: string;                        // 도구 출력 (요약)
  tokensUsed?: number;

  // 보안
  riskLevel: "none" | "low" | "medium" | "high" | "critical";
  approved: boolean;                      // 사용자 승인 여부
  blocked: boolean;                       // 보안 정책에 의해 차단됨
  blockReason?: string;
}

type AuditAction =
  | "FILE_READ" | "FILE_WRITE" | "FILE_EDIT" | "FILE_DELETE"
  | "SHELL_EXEC" | "GIT_COMMIT" | "GIT_PUSH"
  | "PACKAGE_INSTALL" | "NETWORK_REQUEST"
  | "SECURITY_SCAN" | "SECRET_DETECTED"
  | "APPROVAL_REQUESTED" | "APPROVAL_GRANTED" | "APPROVAL_DENIED";

// 불변 로그 — append-only, 삭제 불가
// 보존 기간: 최소 3년 (한국법), 금융 5년
// SIEM 연동: Splunk, Elastic, DataDog 포워딩 지원
```

#### 4.0.5 AI 생성 코드 자동 보안 스캔

```
에이전트 코드 생성 → 자동 보안 파이프라인:

1. 에이전트가 file_write / file_edit 실행
2. 변경된 코드에 대해 자동 보안 스캔 트리거
3. Security Scanner가 추론 기반 분석 수행
4. critical/high 발견 시:
   a. 에이전트에게 피드백 → 자동 수정 시도
   b. 수정 실패 시 → 유저에게 경고 + 승인 요청
5. 스캔 결과를 감사 로그에 기록
6. 의존성 추가 시 → npm audit / Snyk 자동 실행

플랜별 보안 스캔:
+-------------+----------+-----------+-----------+-----------+
| 기능         | FREE     | PRO       | BUSINESS  | ENTERPRISE|
+-------------+----------+-----------+-----------+-----------+
| 기본 스캔    | -        | quick     | deep      | deep      |
| 자동 패치    | -        | X         | O         | O         |
| 커스텀 규칙  | -        | X         | 10개      | 무제한    |
| 감사 리포트  | -        | X         | 월간      | 실시간    |
| SIEM 연동   | -        | X         | X         | O         |
| 컴플라이언스 | -        | X         | PIPA      | 전체      |
+-------------+----------+-----------+-----------+-----------+
```

#### 4.0.6 한국 컴플라이언스 대응

| 규제 | 요구사항 | YUAN 대응 | Phase |
|------|----------|----------|-------|
| **개인정보보호법 (PIPA)** | 최소수집, 동의, 파기, 국외이전 보호 | PII 자동 감지/마스킹, 데이터 레지던시 | Phase 1 |
| **AI 기본법 (2025)** | 고위험 AI 분류, 투명성, 영향평가 | AI 행위 감사 로그, 모델 선택 투명성 | Phase 2 |
| **CSAP (클라우드 보안인증)** | 공공기관 납품 필수 | NCP/KT Cloud 배포 옵션 | Phase 3 |
| **신용정보법** | 금융 데이터 추가 규제 | 금융 전용 보안 정책 프리셋 | Phase 3 |
| **ISMS-P** | 정보보호 및 개인정보보호 관리체계 인증 | SOC2 + ISO27001 기반 대응 | Phase 3 |

#### 4.0.7 보안 인증 로드맵

```
Phase 1 (MVP):
  ✓ TLS 1.3 + AES-256 암호화
  ✓ RBAC (admin-rbac.ts 확장)
  ✓ 감사 로그 (전체 에이전트 행위)
  ✓ 프롬프트 인젝션 방어
  ✓ 출력 DLP (시크릿/PII 마스킹)
  ✓ PIPA 준수

Phase 2 (엔터프라이즈 진입, +3개월):
  ✓ SSO/SAML 2.0 + OIDC
  ✓ 에이전트 샌드박싱 (gVisor)
  ✓ AI 생성 코드 자동 보안 스캔
  ✓ 불변 감사 로그 (3년 보존)
  ✓ 데이터 레지던시 (한국 리전)
  ✓ SOC 2 Type II 준비

Phase 3 (시장 차별화, +6개월):
  ✓ ISO 27001 + ISO 42001 인증
  ✓ AI 레드팀 파이프라인 (PyRIT/Garak)
  ✓ SIEM 연동 (Splunk, Elastic, DataDog)
  ✓ VPC Peering / Private Link
  ✓ AI 거버넌스 대시보드
  ✓ SBOM 자동 생성
  ✓ CSAP 인증 (공공기관)
```

#### 4.0.8 4단계 승인 시스템

```typescript
// yua-backend/src/agent/security/approval-policy.ts

type ApprovalLevel = "strict" | "standard" | "relaxed" | "autonomous";

interface ApprovalPolicy {
  level: ApprovalLevel;
  rules: {
    strict: {
      // 모든 도구 호출에 승인 필요 (ENTERPRISE 보안 모드)
      requireApproval: "all";
    };
    standard: {
      // 읽기는 자동, 쓰기/실행은 승인 (기본값)
      autoApprove: ["file_read", "grep", "glob", "git_ops:status|diff|log"];
      requireApproval: ["file_write", "file_edit", "shell_exec", "git_ops:commit|push"];
    };
    relaxed: {
      // 위험 명령만 승인
      autoApprove: ["file_read", "file_write", "file_edit", "grep", "glob"];
      requireApproval: ["shell_exec:dangerous", "git_ops:push", "file_delete"];
    };
    autonomous: {
      // 차단 명령만 거부 (개인 프로젝트용, 경고 표시)
      autoApprove: "all";
      blocked: BLOCKED_COMMANDS;
    };
  };
}

// 플랜별 기본 승인 레벨
const DEFAULT_APPROVAL = {
  FREE: "strict",       // Chat만이라 해당 없음
  PRO: "standard",
  BUSINESS: "relaxed",
  ENTERPRISE: "standard", // 엔터프라이즈는 보안 우선
} as const;
```

#### 4.0.9 세션 리플레이

```typescript
interface SessionReplay {
  sessionId: string;
  events: ReplayEvent[];          // 모든 에이전트 이벤트 기록
  totalDuration: number;

  // 보안 조사용 전체 재생
  play(speed?: number): AsyncIterator<ReplayEvent>;
  seekTo(timestamp: number): void;

  // 필터링
  filterByTool(tool: string): ReplayEvent[];
  filterBySeverity(severity: string): ReplayEvent[];

  // 내보내기
  exportAsReport(): SecurityReport;    // PDF 보고서 생성
  exportAsTimeline(): TimelineData;    // 시각화용
}
```

#### 4.0.10 코드 출처 추적 (AI Blame)

```typescript
interface CodeProvenance {
  filePath: string;
  lineRange: [number, number];

  // 출처
  author: "ai" | "human";
  model?: string;                     // "claude-sonnet-4-6", "gpt-4o", ...
  prompt?: string;                    // 생성 프롬프트 (해시)
  sessionId: string;
  timestamp: number;

  // 검증
  securityScanned: boolean;
  scanResult?: SecurityFinding[];
  testsPassed?: boolean;

  // Git 메타데이터
  commitHash?: string;
  // `yuan blame src/api/users.ts` → AI가 생성한 줄 하이라이트
}
```

#### 4.0.11 실시간 행동 모니터링

```typescript
interface BehaviorMonitor {
  // 비정상 패턴 감지
  rules: BehaviorRule[];

  onAnomaly(handler: (anomaly: Anomaly) => void): void;
}

type BehaviorRule =
  | { type: "FILE_DELETE_BURST"; threshold: 10; windowMs: 60_000 }     // 1분에 10개 이상 삭제
  | { type: "OUTSIDE_PROJECT_ACCESS"; action: "block" }                 // 프로젝트 외부 접근
  | { type: "NETWORK_SCAN"; ports: number[]; action: "block" }         // 포트 스캔 시도
  | { type: "TOKEN_BURST"; threshold: 50_000; windowMs: 60_000 }       // 비정상 토큰 소비
  | { type: "RECURSIVE_WRITE"; maxDepth: 3 }                           // 같은 파일 반복 수정
  | { type: "SENSITIVE_DIR_ACCESS"; dirs: ["/etc", "/root", "~/.ssh"] } // 민감 디렉토리
  ;

interface Anomaly {
  rule: BehaviorRule;
  timestamp: number;
  sessionId: string;
  action: "warn" | "pause" | "terminate";   // 심각도에 따라
  details: string;
}
// 비정상 감지 시 → 세션 일시 중지 + 관리자 Slack/이메일 알림
```

#### 4.0.12 제로 트러스트 에이전트 아키텍처

```
모든 도구 호출은 7단계 검증 파이프라인:

LLM 도구 호출 요청
  ↓
[1] Policy Engine → 정책 검증 (allowlist, 파일 경로, 명령어)
  ↓
[2] Approval Gate → 승인 레벨에 따라 자동/수동 승인
  ↓
[3] Rate Limiter → 빈도 검증 (burst 감지)
  ↓
[4] Input Scanner → 입력에서 시크릿/인젝션 스캔
  ↓
[5] Sandbox Executor → 격리 환경에서 실행
  ↓
[6] Output Sanitizer → 출력에서 민감 정보 제거
  ↓
[7] Audit Logger → 전체 기록 (불변 로그)
  ↓
결과를 LLM에 반환
```

#### 4.0.13 출력 새니타이징

```typescript
// AI 응답 및 도구 출력에서 민감 정보 자동 마스킹

function sanitizeAgentOutput(output: string): string {
  let sanitized = output;

  // 1. 시크릿 패턴 마스킹
  for (const pattern of SECRET_PATTERNS) {
    sanitized = sanitized.replace(pattern.regex, `[REDACTED:${pattern.name}]`);
  }

  // 2. PII 마스킹 (한국)
  sanitized = sanitized
    .replace(/\d{6}-\d{7}/g, "******-*******")          // 주민번호
    .replace(/01[016789]-\d{3,4}-\d{4}/g, "***-****-****")  // 전화번호
    .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[EMAIL]");

  // 3. 엔트로피 기반 (의심스러운 고엔트로피 문자열)
  sanitized = maskHighEntropyStrings(sanitized, threshold: 4.5);

  return sanitized;
}
```

#### 4.0.14 데이터 보존/삭제 정책

```
데이터 유형별 보존 기간:

+──────────────────+──────────+──────────+──────────+──────────+
│ 데이터 유형       │ FREE     │ PRO      │ BUSINESS │ ENTERPRISE│
+──────────────────+──────────+──────────+──────────+──────────+
│ 프로젝트 파일     │ 세션 종료 │ 7일      │ 30일     │ 무제한    │
│ 에이전트 대화     │ 30일     │ 90일     │ 1년      │ 무제한    │
│ 감사 로그         │ -        │ 90일     │ 3년      │ 7년       │
│ 보안 스캔 결과    │ -        │ 30일     │ 1년      │ 7년       │
│ 세션 리플레이     │ -        │ -        │ 90일     │ 1년       │
+──────────────────+──────────+──────────+──────────+──────────+

GDPR/PIPA 삭제 요청:
  - 유저 요청 시 30일 내 완전 삭제
  - 감사 로그는 법적 의무 기간 후 삭제 (한국: 3년)
  - 백업에서도 삭제 (90일 내 자연 만료)
```

#### 4.0.15 팀/RBAC 보안 정책

```typescript
interface TeamSecurityPolicy {
  workspaceId: string;

  roles: {
    owner: {
      canManageAgents: true;
      canViewAuditLogs: true;
      canSetSecurityPolicy: true;
      canApproveDestructive: true;
      maxParallelAgents: "unlimited";
    };
    admin: {
      canManageAgents: true;
      canViewAuditLogs: true;
      canSetSecurityPolicy: false;
      canApproveDestructive: true;
      maxParallelAgents: "plan_limit";
    };
    developer: {
      canManageAgents: true;           // 자기 에이전트만
      canViewAuditLogs: false;         // 자기 로그만
      canSetSecurityPolicy: false;
      canApproveDestructive: false;    // 관리자 승인 필요
      maxParallelAgents: "plan_limit";
    };
    viewer: {
      canManageAgents: false;
      canViewAuditLogs: false;
      canSetSecurityPolicy: false;
      canApproveDestructive: false;
      maxParallelAgents: 0;
    };
  };

  // 조직 전체 정책
  orgPolicy: {
    allowedModels: string[];              // 허용 모델만 사용
    blockedPatterns: string[];            // 금지 코드 패턴
    mandatorySecurityScan: boolean;       // 필수 보안 스캔
    requireCodeReview: boolean;           // AI 코드 리뷰 필수
    maxTokensPerDay: number;              // 일일 토큰 한도
  };
}
```

### 4.1 Docker 샌드박스

```typescript
// yua-backend/src/agent/sandbox/docker-sandbox.ts

interface SandboxConfig {
  image: string;                       // "yuan-sandbox:node20" | "yuan-sandbox:python3" | ...
  memoryLimitMb: number;              // 기본 512MB, ENTERPRISE: 2048MB
  cpuLimit: number;                    // 기본 1 core, ENTERPRISE: 4 cores
  diskLimitMb: number;                // 기본 1024MB
  networkAccess: boolean;             // FREE/PRO: false, BUSINESS+: true (allowlist)
  timeoutMs: number;                  // 기본 300_000 (5분)

  // 보안
  readOnlyPaths: string[];            // ["/etc", "/usr", "/bin"]
  blockedCommands: string[];          // ["rm -rf /", "curl", "wget", ...]
  allowedPorts: number[];             // 네트워크 허용 시 포트 제한
}

interface SandboxInstance {
  containerId: string;
  sessionId: string;
  workDir: string;                     // 컨테이너 내 프로젝트 경로
  status: "creating" | "running" | "stopped" | "destroyed";
  createdAt: number;

  // 리소스 사용량
  memoryUsedMb: number;
  cpuPercent: number;
  diskUsedMb: number;
}

// 플랜별 샌드박스 스펙
const SANDBOX_SPECS = {
  FREE:       { memory: 256,  cpu: 0.5, disk: 512,  network: false, timeout: 120_000 },
  PRO:        { memory: 512,  cpu: 1,   disk: 1024, network: false, timeout: 300_000 },
  BUSINESS:   { memory: 1024, cpu: 2,   disk: 2048, network: true,  timeout: 600_000 },
  ENTERPRISE: { memory: 2048, cpu: 4,   disk: 4096, network: true,  timeout: 900_000 },
} as const;
```

#### 4.1.1 3계층 샌드박스 아키텍처

```
계층 구조:

Layer 1: Nsjail (경량, <100ms)
  → 모든 세션에 기본 적용
  → 네임스페이스/cgroup 격리
  → 파일시스템 읽기 전용 (프로젝트 디렉토리만 쓰기)
  → FREE/PRO 기본

Layer 2: Docker + gVisor (중간, 1-3s)
  → BUSINESS+ 기본
  → 시스콜 필터링, 커널 공격 표면 최소화
  → 네트워크 allowlist 제어

Layer 3: Firecracker microVM (최고 격리, 125ms)
  → ENTERPRISE 전용
  → 전용 커널, 하드웨어 수준 격리
  → 완전한 네트워크 분리
```

### 4.2 Git 통합

```typescript
// yua-backend/src/agent/git-integration.ts

interface GitIntegration {
  // 에이전트 작업 결과를 Git으로 관리
  createBranch(session: ProjectSession, branchName: string): Promise<void>;
  commitChanges(session: ProjectSession, message: string): Promise<string>;  // commit hash
  createPR(session: ProjectSession, config: PRConfig): Promise<PRResult>;
  getDiff(session: ProjectSession): Promise<string>;

  // GitHub/GitLab 연동
  pushToRemote(session: ProjectSession, remote: string): Promise<void>;
  fetchPR(session: ProjectSession, prNumber: number): Promise<PRDetail>;
}

interface PRConfig {
  title: string;
  body: string;
  baseBranch: string;
  headBranch: string;
  labels?: string[];
  reviewers?: string[];
  draft?: boolean;
}

interface PRResult {
  url: string;
  number: number;
  headBranch: string;
  filesChanged: number;
  additions: number;
  deletions: number;
}
```

### 4.3 보안 정책

```
+-------------------+------------------------------------------+
| 위협               | 대응                                     |
+-------------------+------------------------------------------+
| 명령어 인젝션      | allowlist 기반 명령어 필터링               |
| 파일시스템 탈출    | chroot + Docker volume mount 제한         |
| 네트워크 악용      | FREE/PRO: 네트워크 차단, BUSINESS+: allowlist |
| 리소스 고갈        | CPU/Memory/Disk cgroup 제한               |
| 민감 파일 접근     | .env, credentials, SSH key 자동 감지 + 차단 |
| 무한 루프          | iteration limit + wall time timeout       |
| 토큰 폭주          | per-request budget (RequestBudget)        |
+-------------------+------------------------------------------+
```

```typescript
// 기존: 파일명에 secret/password/token이 포함되면 무조건 차단 (과도)
// 수정: .env, 설정 파일, 키 파일만 차단. 소스 코드는 허용.

const SENSITIVE_FILE_PATTERNS = [
  // 환경 설정 파일 (차단)
  /\.env(\..+)?$/,
  /\.env\.local$/,

  // 인증서/키 파일 (차단)
  /\.(pem|key|p12|pfx|jks|keystore)$/,

  // 자격 증명 파일 (차단)
  /credentials?\.(json|yaml|yml|xml|ini|cfg)$/i,
  /\.aws\/credentials$/,
  /\.ssh\/(id_|known_hosts|config)/,
  /\.netrc$/,
  /\.pgpass$/,

  // 토큰/시크릿 설정 파일 (차단)
  /secrets?\.(json|yaml|yml|xml|ini|cfg|toml)$/i,

  // Docker secrets (차단)
  /\/run\/secrets\//,
];

// 소스 코드 내 시크릿 감지는 별도 SecretDetector (4.0.3)에서 처리
// → 파일 읽기는 허용하되, 시크릿이 발견되면 경고
// → src/utils/secret-manager.ts, src/auth/token-parser.ts 등은 정상 접근 가능

function isSensitiveFile(filePath: string): boolean {
  return SENSITIVE_FILE_PATTERNS.some(p => p.test(filePath));
}
```

#### 4.3.1 네트워크 Allowlist 상세

```typescript
interface NetworkPolicy {
  // 플랜별 기본 정책
  FREE: { network: "blocked" };
  PRO: { network: "blocked" };
  BUSINESS: {
    network: "allowlist";
    allowed: [
      // 패키지 매니저
      "registry.npmjs.org",
      "pypi.org",
      "rubygems.org",
      "crates.io",
      // Git 호스팅
      "github.com",
      "gitlab.com",
      "bitbucket.org",
      // CDN
      "cdn.jsdelivr.net",
      "unpkg.com",
    ];
    // 커스텀 도메인 추가 가능 (관리자 설정)
    customAllowed: string[];
    // DNS 기반 차단 (IP 직접 접근 차단)
    blockDirectIP: true;
  };
  ENTERPRISE: {
    network: "custom";           // 완전 커스텀 정책
    // VPC Peering 지원
    // Private Link 지원
  };
}
```

---

## 5. Tool System 상세

### 5.1 도구 정의 (9개)

```typescript
// yua-shared/src/agent/tool.types.ts (설계)

type CodingToolName =
  | "file_read"
  | "file_write"
  | "file_edit"
  | "shell_exec"
  | "grep"
  | "glob"
  | "git_ops"
  | "code_search"
  | "test_run";
```

### 5.2 file_read

```typescript
interface FileReadInput {
  path: string;                        // 상대 경로 (프로젝트 루트 기준)
  offset?: number;                     // 시작 줄 번호 (1-based)
  limit?: number;                      // 읽을 줄 수 (기본: 전체)
}

interface FileReadOutput {
  content: string;                     // 파일 내용 (줄 번호 포함)
  totalLines: number;
  language: string;                    // 감지된 언어
  truncated: boolean;                  // 전체 미포함 시 true
}

// 제한: 단일 파일 최대 50KB, 초과 시 offset/limit 필수
// 바이너리 파일: 거부 (이미지, 실행파일 등)
```

### 5.3 file_write

```typescript
interface FileWriteInput {
  path: string;
  content: string;
  createDirectories?: boolean;         // 중간 디렉토리 자동 생성 (기본 true)
}

interface FileWriteOutput {
  bytesWritten: number;
  created: boolean;                    // 신규 생성 vs 덮어쓰기
}

// 제한: 기존 파일 덮어쓰기 시 경고 (file_edit 권장)
// 민감 파일 패턴 매칭 시 거부
```

### 5.4 file_edit

```typescript
interface FileEditInput {
  path: string;
  old_string: string;                  // 교체할 기존 문자열
  new_string: string;                  // 새 문자열
  replace_all?: boolean;               // 전체 교체 (기본 false)
}

interface FileEditOutput {
  replacements: number;                // 교체된 횟수
  preview: string;                     // 변경 전후 3줄 컨텍스트
}

// old_string이 파일에 없으면 에러
// old_string이 여러 번 매칭되고 replace_all=false이면 에러 (모호성 방지)
```

### 5.5 shell_exec

```typescript
interface ShellExecInput {
  command: string;
  cwd?: string;                        // 작업 디렉토리 (기본: 프로젝트 루트)
  timeout?: number;                    // ms (기본: 30_000)
  env?: Record<string, string>;        // 추가 환경 변수
}

interface ShellExecOutput {
  exitCode: number;
  stdout: string;                      // 최대 100KB, 초과 시 tail
  stderr: string;                      // 최대 50KB
  timedOut: boolean;
  durationMs: number;
}

// 차단 명령어: rm -rf /, sudo, curl (네트워크 차단 모드), ...
// 대화형 명령어 거부: vim, nano, less, ...
// Phase 3: Docker 내 실행으로 격리
```

### 5.6 grep

```typescript
interface GrepInput {
  pattern: string;                     // 정규식 패턴
  path?: string;                       // 검색 경로 (기본: 프로젝트 루트)
  glob?: string;                       // 파일 패턴 필터 (예: "*.ts")
  maxResults?: number;                 // 기본 50
  context?: number;                    // 전후 줄 수 (기본 0)
}

interface GrepOutput {
  matches: GrepMatch[];
  totalMatches: number;
  truncated: boolean;
}

interface GrepMatch {
  file: string;
  line: number;
  content: string;
  contextBefore?: string[];
  contextAfter?: string[];
}
```

### 5.7 glob

```typescript
interface GlobInput {
  pattern: string;                     // glob 패턴 (예: "src/**/*.tsx")
  path?: string;                       // 기준 경로
  maxResults?: number;                 // 기본 100
}

interface GlobOutput {
  files: string[];                     // 매칭된 파일 경로 목록
  totalMatches: number;
  truncated: boolean;
}
```

### 5.8 git_ops

```typescript
interface GitOpsInput {
  operation:
    | "status"                         // git status
    | "diff"                           // git diff (staged + unstaged)
    | "log"                            // git log (최근 N개)
    | "commit"                         // git commit
    | "create_branch"                  // git checkout -b
    | "stash"                          // git stash
    | "restore";                       // git restore (변경 취소)

  // operation별 추가 파라미터
  message?: string;                    // commit용
  branchName?: string;                 // create_branch용
  count?: number;                      // log 개수 (기본 10)
  files?: string[];                    // commit/restore 대상 파일
}

interface GitOpsOutput {
  result: string;                      // 명령 출력
  success: boolean;
}
```

### 5.9 code_search (시맨틱 검색)

```typescript
interface CodeSearchInput {
  query: string;                       // 자연어 검색 쿼리 (예: "유저 인증 처리하는 함수")
  scope?: "function" | "class" | "file" | "all";
  language?: string;                   // 언어 필터
  maxResults?: number;                 // 기본 10
}

interface CodeSearchOutput {
  results: CodeSearchResult[];
}

interface CodeSearchResult {
  file: string;
  startLine: number;
  endLine: number;
  symbolName: string;                  // 함수/클래스 이름
  symbolType: "function" | "class" | "interface" | "type" | "variable";
  snippet: string;                     // 코드 스니펫
  relevanceScore: number;              // 0.0 ~ 1.0
}
```

### 5.10 test_run

```typescript
interface TestRunInput {
  command?: string;                    // 커스텀 테스트 명령 (기본: 자동 감지)
  files?: string[];                    // 특정 테스트 파일만 실행
  timeout?: number;                    // ms (기본: 60_000)
}

interface TestRunOutput {
  passed: number;
  failed: number;
  skipped: number;
  errors: TestError[];
  duration: number;
  coverage?: { lines: number; branches: number; functions: number };
  stdout: string;
}

interface TestError {
  testName: string;
  file: string;
  line: number;
  message: string;
  expected?: string;
  actual?: string;
}

// 자동 감지: package.json scripts.test, pytest, go test, cargo test, ...
```

---

## 6. Agentic Loop 아키텍처

### 6.1 LLM Provider 선택

```typescript
// 작업 유형별 최적 모델 자동 선택

interface ModelSelector {
  selectModel(task: AgentTask, plan: Plan): ModelConfig;
}

const MODEL_ROUTING = {
  // 코딩 작업 → Claude Sonnet/Opus (코딩 벤치마크 1위)
  coding: {
    FREE: "claude-haiku",              // 빠른 간단 수정
    PRO: "claude-sonnet",              // 주력 코딩
    BUSINESS: "claude-sonnet",
    ENTERPRISE: "claude-opus",         // 복잡한 아키텍처 설계
  },

  // 코드 검색/분석 → GPT (대규모 컨텍스트)
  search: {
    FREE: "gpt-4o-mini",
    PRO: "gpt-4o",
    BUSINESS: "gpt-4o",
    ENTERPRISE: "gpt-4o",
  },

  // 코드 리뷰/검증 → Gemini (비용 효율)
  review: {
    FREE: "gemini-flash",
    PRO: "gemini-pro",
    BUSINESS: "gemini-pro",
    ENTERPRISE: "claude-opus",         // 고품질 리뷰
  },
} as const;
```

### 6.2 SSE 스트리밍 (실시간 UI 업데이트)

```typescript
// Agent 실행 중 SSE 이벤트

type AgentStreamEvent =
  | { kind: "agent:start"; taskId: string; goal: string }
  | { kind: "agent:thinking"; content: string }              // LLM 사고 과정
  | { kind: "agent:tool_call"; tool: string; input: unknown } // 도구 호출
  | { kind: "agent:tool_result"; tool: string; output: unknown; durationMs: number }
  | { kind: "agent:file_change"; path: string; diff: string } // 파일 변경
  | { kind: "agent:iteration"; index: number; tokensUsed: number }
  | { kind: "agent:error"; message: string; retryable: boolean }
  | { kind: "agent:approval_needed"; action: PendingAction }  // 유저 승인 대기
  | { kind: "agent:completed"; summary: string; filesChanged: string[] }

  // Phase 2: DAG 이벤트
  | { kind: "dag:start"; totalTasks: number }
  | { kind: "dag:task_start"; taskId: string; agentId: string }
  | { kind: "dag:task_complete"; taskId: string; result: string }
  | { kind: "dag:task_failed"; taskId: string; error: string }
  | { kind: "dag:conflict"; files: string[]; resolution: string }
  | { kind: "dag:progress"; completed: number; total: number; running: string[] }
  | { kind: "dag:completed"; summary: DAGSummary };
```

### 6.3 승인 시스템

```typescript
// 위험한 작업은 유저 승인 필요

type ApprovalAction =
  | "DELETE_FILE"                      // 파일 삭제
  | "OVERWRITE_FILE"                   // 기존 파일 전체 덮어쓰기
  | "INSTALL_PACKAGE"                  // npm install, pip install
  | "RUN_DANGEROUS_CMD"               // 위험한 쉘 명령
  | "MODIFY_CONFIG"                    // 설정 파일 변경 (tsconfig, package.json, ...)
  | "GIT_PUSH"                         // 원격 푸시
  | "CREATE_PR";                       // PR 생성

interface PendingAction {
  id: string;
  type: ApprovalAction;
  description: string;                 // 유저에게 보여줄 설명
  details: unknown;                    // 변경 내용 상세
  risk: "low" | "medium" | "high";
  timeout: number;                     // 승인 대기 시간 (ms, 기본 120_000)
}

// 자동 승인 설정 (유저가 사전에 허용)
interface AutoApprovalConfig {
  autoApprove: ApprovalAction[];       // 자동 승인할 액션 목록
  requireApproval: ApprovalAction[];   // 항상 승인 필요
  // 기본: DELETE_FILE, GIT_PUSH, CREATE_PR는 항상 승인 필요
}
```

### 6.4 자동 수정 루프 (Error Recovery + Sub-agent Review)

```typescript
// yua-backend/src/agent/auto-fix-loop.ts

/**
 * 자동 수정 루프 — 메인 에이전트가 서브 에이전트 결과를 검증하고 실수를 잡아냄
 *
 * 관찰: Claude Code에서 메인 에이전트가 서브 에이전트의 결과를 받으면
 * 1) 흥미로운 발견에 추가 탐구
 * 2) 서브 에이전트의 실수를 감지하고 수정 지시
 * 이 패턴을 YUAN에 공식 메커니즘으로 내장
 */

interface AutoFixLoop {
  // Phase 1: 단일 에이전트 자동 수정
  singleAgentLoop: {
    maxRetries: number;                    // 기본 3회
    triggers: AutoFixTrigger[];

    // 루프 흐름:
    // 1. 에이전트가 코드 수정
    // 2. 자동으로 빌드/테스트 실행
    // 3. 실패 시 → 에러 메시지를 에이전트에 피드백
    // 4. 에이전트가 수정 시도
    // 5. 성공할 때까지 반복 (maxRetries까지)
  };

  // Phase 2: 메인-서브 에이전트 검증 루프
  multiAgentReview: {
    // 서브 에이전트 작업 완료 후
    // 메인(Governor) 에이전트가 결과 검증
    reviewStrategy: "auto" | "selective" | "always";

    // auto: 서브 에이전트가 에러 보고 시에만 검증
    // selective: 중요 파일 변경 시 검증
    // always: 모든 서브 에이전트 결과 검증

    // 검증 체크리스트:
    checks: [
      "TYPE_CHECK",          // tsc --noEmit 성공?
      "TEST_PASS",           // 기존 테스트 통과?
      "LINT_PASS",           // lint 에러 없음?
      "SECURITY_SCAN",       // 보안 취약점 없음?
      "DIFF_REVIEW",         // diff가 요청 범위 내인가?
      "IMPORT_INTEGRITY",    // import/export 깨지지 않았나?
    ];

    // 실수 감지 시:
    onMistakeDetected: {
      action: "auto_fix" | "reassign" | "escalate_to_user";
      // auto_fix: 메인 에이전트가 직접 수정
      // reassign: 서브 에이전트에게 수정 지시 + 에러 컨텍스트 전달
      // escalate_to_user: 유저에게 판단 요청
    };
  };
}

type AutoFixTrigger =
  | "BUILD_FAIL"           // tsc, webpack, vite 빌드 실패
  | "TEST_FAIL"            // jest, vitest, pytest 테스트 실패
  | "LINT_ERROR"           // eslint, prettier 에러
  | "RUNTIME_ERROR"        // 실행 시 에러 (node, python)
  | "SECURITY_FINDING"     // 보안 스캔 critical/high
  | "TYPE_ERROR"           // TypeScript 타입 에러
  | "IMPORT_ERROR";        // 모듈 import 실패

// 자동 수정 흐름 예시:
//
// [서브 에이전트 A] file_edit → src/api/users.ts 수정
//   ↓
// [자동 검증] tsc --noEmit → ERROR: Property 'email' does not exist on type 'User'
//   ↓
// [메인 에이전트] "서브 에이전트 A가 User 타입에 없는 email 접근. types/user.ts 확인 필요"
//   ↓
// [메인 에이전트] 선택지:
//   a) 직접 수정 (타입 파일이 자기 관할이면)
//   b) 서브 에이전트 A에게 재지시: "User 타입에 email 필드 추가하거나 기존 필드 사용해"
//   c) 새 서브 에이전트 생성: "types/user.ts에 email 필드 추가"
```

---

## 7. Context Window 관리

### 7.1 토큰 예산 배분

```
Total Context Window (예: 200K tokens)
  |
  +-- System Prompt (3-5K)
  |     +-- 에이전트 역할/규칙
  |     +-- 프로젝트 구조 요약
  |     +-- 사용 가능 도구 스키마
  |
  +-- Project Context (10-30K, 동적)
  |     +-- 현재 작업 관련 파일 내용
  |     +-- import/export 관계 요약
  |     +-- 최근 변경 diff
  |
  +-- Conversation History (10-50K, 슬라이딩)
  |     +-- 유저 메시지
  |     +-- 에이전트 응답/도구 호출 결과
  |
  +-- Tool Results Buffer (가변)
  |     +-- 최근 도구 실행 결과
  |     +-- 오래된 결과는 요약으로 압축
  |
  +-- Output Reserve (4-8K)
        +-- LLM 응답 + 도구 호출 생성용
```

### 7.2 도구 결과 압축

```typescript
// 도구 결과가 너무 크면 자동 압축

const TOOL_RESULT_LIMITS = {
  file_read: 50_000,                   // 50KB → 초과 시 요약
  shell_exec: 100_000,                 // stdout 100KB → tail
  grep: 10_000,                        // 매칭 결과 10KB → top N
  glob: 5_000,                         // 파일 목록 5KB → 패턴별 카운트
  test_run: 20_000,                    // 테스트 결과 20KB → 실패만
};

function compressToolResult(tool: string, result: string): string {
  const limit = TOOL_RESULT_LIMITS[tool] ?? 10_000;
  if (result.length <= limit) return result;

  // 전략: 앞 30% + "... (truncated N chars) ..." + 뒤 30%
  const head = Math.floor(limit * 0.3);
  const tail = Math.floor(limit * 0.3);
  const truncated = result.length - head - tail;
  return `${result.slice(0, head)}\n\n... (${truncated} chars truncated) ...\n\n${result.slice(-tail)}`;
}
```

### 7.3 히스토리 슬라이딩 윈도우

```typescript
// Iteration이 많아지면 오래된 결과를 요약으로 교체

interface HistoryCompaction {
  // 최근 5개 iteration: 원본 유지
  // 6~15번째: 도구 결과만 요약으로 교체
  // 16번째 이상: iteration 전체를 1줄 요약으로 압축

  recentWindow: number;                // 원본 유지 개수 (기본 5)
  summaryWindow: number;               // 요약 유지 개수 (기본 10)
  // 그 이전은 "Iteration 1-5: 프로젝트 구조 분석 완료, 12개 파일 확인" 수준으로 압축
}
```

### 7.4 YUAN.md 프로젝트 메모리

```typescript
// YUAN.md — 프로젝트 인식 파일 (CLAUDE.md 영감)

/**
 * YUAN.md는 프로젝트 루트에 배치하는 에이전트 컨텍스트 파일.
 * 에이전트가 세션 시작 시 자동으로 읽어 프로젝트 컨텍스트를 이해한다.
 *
 * CLAUDE.md가 Claude Code에게 프로젝트 규칙을 알려주듯,
 * YUAN.md는 YUAN 에이전트에게 프로젝트의 모든 것을 알려준다.
 */

interface YuanMdConfig {
  // 자동 탐색 경로 (우선순위 순)
  searchPaths: [
    "YUAN.md",                            // 프로젝트 루트
    ".yuan/config.md",                    // .yuan 디렉토리
    ".yuan/YUAN.md",
    "docs/YUAN.md",
  ];

  // 하위 디렉토리 YUAN.md (모듈별 컨텍스트)
  // src/api/YUAN.md → API 모듈 전용 규칙
  // src/auth/YUAN.md → 인증 모듈 전용 규칙
  nestedSupport: true;

  // 자동 생성
  autoGenerate: {
    // 프로젝트 최초 접근 시 YUAN.md 자동 생성 제안
    enabled: true;
    // 분석 항목:
    analyze: [
      "package.json",      // 의존성, 스크립트
      "tsconfig.json",     // 타입스크립트 설정
      ".eslintrc",         // 린트 규칙
      "README.md",         // 프로젝트 설명
      "directory_tree",    // 디렉토리 구조
    ];
  };
}

// YUAN.md 예시:
/*
# Project: yua-backend

## Stack
- Express 4.18 + TypeScript
- PostgreSQL (Prisma) + MySQL + Redis
- Firebase Auth

## Rules
- 공유 타입은 yua-shared에서만 정의
- pnpm만 사용 (npm/yarn 금지)
- SSE 스트리밍: X-Accel-Buffering: no 유지

## Commands
- dev: pnpm --filter yua-backend dev
- build: pnpm --filter yua-backend build
- test: pnpm --filter yua-backend test

## Architecture
- 인증: Firebase → requireFirebaseAuth → withWorkspace
- 스트리밍: StreamEngine → SSE event/stream
- AI: provider-selector.ts → claude/gpt/gemini

## Do NOT
- .env 파일 수정 금지
- prisma schema 직접 변경 금지 (migration 사용)
- 전역 pnpm 설치 금지
*/
```

```typescript
// 자동 메모리 학습 — 에이전트가 작업하면서 YUAN.md를 자동 업데이트

interface YuanMemoryEngine {
  // 자동 학습 트리거
  triggers: [
    "BUILD_PATTERN",       // 빌드 명령어/설정 학습
    "ERROR_RESOLUTION",    // 에러 해결 패턴 학습
    "CODE_CONVENTION",     // 코딩 컨벤션 학습 (네이밍, 구조)
    "DEPENDENCY_PATTERN",  // 의존성 사용 패턴
    "TEST_PATTERN",        // 테스트 패턴 학습
  ];

  // 학습 후 YUAN.md 업데이트 제안
  // (자동 수정이 아닌, 유저 승인 후 반영)
  suggestUpdate(finding: MemoryFinding): YuanMdPatch;

  // 세션 간 메모리 전달
  // 이전 세션에서 학습한 내용을 다음 세션에 전달
  carryOver(sessionId: string): MemoryContext;
}
```

### 7.5 세션 저장/복구 (yuan resume)

```typescript
// yua-backend/src/agent/session/session-persistence.ts

/**
 * 세션 저장 & 복구 — `yuan resume` 지원
 *
 * 에이전트 작업을 중간에 저장하고, 나중에 이어서 작업 가능.
 * Claude Code의 컨텍스트 이어가기와 유사하지만, 서버 기반이라 더 강력.
 */

interface SessionPersistence {
  // 세션 저장 (자동 + 수동)
  save(sessionId: string): Promise<SessionSnapshot>;

  // 세션 복구
  resume(sessionId: string): Promise<AgentSession>;

  // 세션 목록
  list(userId: number, workspaceId: string): Promise<SessionSummary[]>;
}

interface SessionSnapshot {
  id: string;
  sessionId: string;

  // 에이전트 상태
  conversationHistory: Message[];         // 전체 대화 이력
  iterationCount: number;
  tokensUsed: TokenUsage;

  // 프로젝트 상태
  changedFiles: FileChange[];             // 변경된 파일 + diff
  workingBranch?: string;
  lastCommitHash?: string;

  // 메모리
  workingMemory: Record<string, unknown>; // 세션 중 학습한 내용
  yuanMdUpdates?: string[];               // YUAN.md 업데이트 후보

  // 메타
  savedAt: number;
  resumable: boolean;                      // 복구 가능 여부
  expiresAt: number;                       // 만료 시간 (플랜별)

  // 요약
  summary: string;                         // 자동 생성된 작업 요약
  pendingTasks: string[];                  // 미완료 작업 목록
}

interface SessionResume {
  // 복구 시 자동 수행:
  // 1. 프로젝트 파일 최신화 (git pull)
  // 2. 저장된 변경사항 재적용
  // 3. 대화 이력 컨텍스트 로드
  // 4. 미완료 작업 목록 표시
  // 5. "이전 세션에서 X를 하고 있었습니다. 계속할까요?" 프롬프트

  restoreStrategy: "full" | "summary" | "minimal";
  // full: 전체 대화 이력 복구
  // summary: 이력 요약 + 최근 5 iterations만 복구
  // minimal: 변경 파일 + 미완료 작업만 복구

  conflictResolution: "rebase" | "merge" | "ask";
  // 복구 중 원본 프로젝트가 변경됐으면?
}

// SDK/CLI 사용법:
// SDK: await yuan.agent.resume(sessionId)
// CLI: npx yuan resume <sessionId>
// CLI: npx yuan resume --last  (가장 최근 세션)
// Web: 세션 목록에서 "이어하기" 버튼
// Mobile: 세션 카드 스와이프 → Resume
```

```typescript
// 파일 탐색 & 메모리 트리거

interface FileExplorationMemory {
  // 에이전트가 파일을 탐색할 때마다 기록
  onFileRead(path: string, content: string): void;

  // 프로젝트 맵 자동 구축
  projectMap: {
    files: Map<string, FileMetadata>;
    importGraph: Map<string, string[]>;    // import 관계
    symbolIndex: Map<string, SymbolInfo>;  // 함수/클래스 인덱스
  };

  // 메모리 트리거 — 특정 조건에서 자동 메모리 저장
  triggers: [
    { event: "ERROR_FIXED"; save: "error_resolution_pattern" },
    { event: "BUILD_SUCCESS"; save: "build_configuration" },
    { event: "TEST_ADDED"; save: "test_pattern" },
    { event: "CONVENTION_DETECTED"; save: "code_convention" },
  ];

  // 세션 내 워킹 메모리 (LRU 캐시)
  workingMemory: LRUCache<string, unknown>;  // 최근 읽은 파일, 분석 결과
}
```

---

## 8. 플랜별 실행 정책

### 8.1 에이전트 리소스 한도

> ⚠️ 플랜별 수치는 섹션 11.2의 SSOT 테이블을 참조하세요.
> 이 섹션에서는 도구 접근 제어만 정의합니다.

### 8.2 도구 접근 제어

```
+-------------+------+------+------+-------+------+------+--------+-------------+----------+
| Tool         | FREE | PRO  | BIZ  | ENT   |
+-------------+------+------+------+-------+
| file_read    | -    | O    | O    | O     |
| file_write   | -    | O    | O    | O     |
| file_edit    | -    | O    | O    | O     |
| shell_exec   | -    | O*   | O    | O     |   * PRO: allowlist만
| grep         | -    | O    | O    | O     |
| glob         | -    | O    | O    | O     |
| git_ops      | -    | diff | full | full  |
| code_search  | -    | O    | O    | O     |
| test_run     | -    | O    | O    | O     |
+-------------+------+------+------+-------+
```

---

## 9. YUA SDK 연동

### 9.1 SDK에서 코딩 에이전트 호출

```typescript
// @yuaone/yuan-sdk (기존 SDK 확장)

import { YuanClient } from "@yuaone/yuan-sdk";

const yuan = new YuanClient({ apiKey: "yua_..." });

// 단일 에이전트 실행
const result = await yuan.agent.run({
  projectUrl: "https://github.com/user/repo",
  branch: "main",
  goal: "Add error handling to all API endpoints",
  model: "coding",                     // 모델 tier
  maxIterations: 25,
  onEvent: (event) => {
    // SSE 스트리밍 이벤트 수신
    console.log(event.kind, event);
  },
});

console.log(result.filesChanged);      // ["src/api/users.ts", ...]
console.log(result.diff);              // unified diff
console.log(result.tokensUsed);        // { input: 45000, output: 12000 }
```

### 9.2 병렬 DAG 실행

```typescript
// SDK에서 병렬 에이전트 실행

const dagResult = await yuan.agent.runParallel({
  projectUrl: "https://github.com/user/repo",
  goal: "Migrate all class components to functional components with hooks",
  maxParallelAgents: 3,
  autoApprove: ["OVERWRITE_FILE", "MODIFY_CONFIG"],
  onDAGEvent: (event) => {
    if (event.kind === "dag:progress") {
      console.log(`${event.completed}/${event.total} tasks done`);
    }
  },
});

console.log(dagResult.summary);
console.log(dagResult.totalFilesChanged);
```

### 9.3 Python SDK

```python
# @yuaone/yuan-sdk-python (기존 SDK 확장)

from yuan_sdk import YuanClient

yuan = YuanClient(api_key="yua_...")

# 코딩 에이전트 실행
result = yuan.agent.run(
    project_url="https://github.com/user/repo",
    goal="Add type hints to all functions",
    model="coding",
    max_iterations=25,
)

for event in result.stream():
    print(event.kind, event.data)

print(result.files_changed)
print(result.diff)
```

### 9.4 CLI 연동

```bash
# npx yuan (기존 CLI 확장)

# Git 프로젝트에서 직접 실행
$ cd my-project
$ npx yuan code "Add unit tests for all service files"

YUAN Coding Agent v1.0.0 | Model: coding | Plan: PRO

[1/25] Scanning project structure...
  Found 24 service files in src/services/

[2/25] Reading src/services/user.service.ts...
[3/25] Writing src/services/__tests__/user.service.test.ts...
...

Result:
  Files created: 24
  Files modified: 1 (jest.config.ts)
  Tests: 156 passed, 0 failed
  Tokens used: 45,230

Apply changes? [Y/n/diff]
```

---

## 10. 프론트엔드 UI 설계

### 10.1 Agent Panel (yua-web)

```
+------------------------------------------------------------------+
| YUAN Agent                                            [Stop] [x] |
+------------------------------------------------------------------+
| Goal: "모든 API 엔드포인트에 에러 핸들링 추가"                       |
|                                                                  |
| [Iteration 3/25] ............ 12,340 tokens                     |
| +--------------------------------------------------------------+|
| | file_read src/api/users.ts                          [2.1s]   ||
| |   -> 142 lines, TypeScript                                   ||
| +--------------------------------------------------------------+|
| | file_edit src/api/users.ts                          [OK]     ||
| |   + try { ... } catch (err) { ... }  (lines 45-67)          ||
| +--------------------------------------------------------------+|
| | shell_exec npx tsc --noEmit                         [0.8s]   ||
| |   -> exit 0, no errors                                       ||
| +--------------------------------------------------------------+|
|                                                                  |
| Changed Files:                                                   |
|   src/api/users.ts        +12 -3    [View Diff]                 |
|   src/api/posts.ts        +15 -4    [View Diff]                 |
|   src/api/auth.ts         +18 -2    [View Diff]                 |
|                                                                  |
| [Apply All] [Apply Selected] [Discard] [Create PR]              |
+------------------------------------------------------------------+
```

### 10.2 DAG Visualization (Phase 2)

```
+------------------------------------------------------------------+
| DAG Execution: "10개 컴포넌트 리팩토링"           3/10 completed  |
+------------------------------------------------------------------+
|                                                                  |
|  [Button.tsx]---+                                                |
|       DONE      |                                                |
|                 +-->[Layout.tsx]                                  |
|  [Card.tsx]-----+      RUNNING                                   |
|     DONE        |                                                |
|                 +-->[App.tsx]                                     |
|  [Modal.tsx]---+       PENDING                                   |
|     RUNNING    |                                                 |
|                +-->[index.ts]                                    |
|  [Input.tsx]        BLOCKED                                      |
|     DONE                                                         |
|                                                                  |
|  Tokens: 34,500 / 140,000  |  Time: 2m 15s  |  Agents: 2/3     |
+------------------------------------------------------------------+
```

### 10.3 Diff Viewer

```
+------------------------------------------------------------------+
| src/api/users.ts                              +12 -3 lines      |
+------------------------------------------------------------------+
|  43 |   async function getUser(req, res) {                       |
|  44 |     const { id } = req.params;                             |
|  45 | - const user = await db.users.findById(id);                |
|  45 | + try {                                                    |
|  46 | +   const user = await db.users.findById(id);              |
|  47 | +   if (!user) {                                           |
|  48 | +     return res.status(404).json({ error: "not_found" }); |
|  49 | +   }                                                      |
|  50 | +   return res.json({ ok: true, user });                   |
|  51 | + } catch (err) {                                          |
|  52 | +   console.error("getUser error:", err);                   |
|  53 | +   return res.status(500).json({ error: "internal" });     |
|  54 | + }                                                        |
|  55 |   }                                                        |
+------------------------------------------------------------------+
| [Accept] [Reject] [Edit Manually]                                |
+------------------------------------------------------------------+
```

---

## 11. 비용 모델 & 마진 설계

### 11.1 에이전트 실행 비용 추정

```
단일 에이전트 (25 iterations 기준):
  - 평균 input tokens: 30K (시스템 프롬프트 + 히스토리 + 도구 결과)
  - 평균 output tokens: 8K (도구 호출 + 텍스트)
  - 모델: Claude Sonnet ($3/$15 per 1M tokens)

  비용 = (30K * $3 + 8K * $15) / 1M = $0.09 + $0.12 = $0.21/실행

병렬 DAG (3 에이전트, 각 15 iterations):
  비용 = 3 * $0.15 = $0.45/실행

병렬 DAG (8 에이전트, 각 20 iterations):
  비용 = 8 * $0.20 = $1.60/실행
```

### 11.2 플랜별 마진 & 리소스 SSOT

⚠️ 아래 테이블이 플랜 수치의 **유일한 SSOT**. 다른 섹션은 이 테이블을 참조.

```
+─────────────+──────────+──────────+──────────+──────────+
│ 항목         │ FREE     │ PRO      │ BUSINESS │ ENTERPRISE│
+─────────────+──────────+──────────+──────────+──────────+
│ 월 가격 (웹) │ ₩0       │ ₩14,900  │ ₩39,000  │ ₩149,000 │
│ USD 환산     │ $0       │ ~$11     │ ~$29     │ ~$110    │
│ 에이전트 모드 │ Chat만   │ Single   │ Parallel │ Parallel │
│ 일일 실행    │ 3회      │ 15회     │ 50회     │ 150회    │
│ 최대 반복    │ 5        │ 25       │ 50       │ 100      │
│ 병렬 에이전트 │ 1(순차)  │ 3        │ 7        │ 무제한   │
│ 토큰/요청    │ 20K      │ 72K      │ 140K     │ 240K     │
│ 세션 TTL     │ 5분      │ 30분     │ 2시간    │ 8시간    │
│ 동시 세션    │ 1        │ 2        │ 5        │ 20       │
│ 샌드박스     │ nsjail   │ nsjail   │ Docker   │ Firecracker │
│ 네트워크     │ 차단     │ 차단     │ allowlist│ 커스텀   │
│ Git 통합     │ diff     │ commit   │ PR 생성  │ PR+CI    │
│ 보안 스캔    │ -        │ quick    │ deep     │ audit    │
│ 감사 로그    │ -        │ 90일     │ 3년      │ 7년      │
+─────────────+──────────+──────────+──────────+──────────+

마진 분석:
  - PRO ₩14,900: 예상 원가 ₩6,000~9,000 → 마진 40~60%
  - BUSINESS ₩39,000: 예상 원가 ₩15,000~20,000 → 마진 48~62%
  - ENTERPRISE ₩149,000: 전용 인프라 포함 → 마진 50%+

  인프라 비용 (LLM API 외):
  - 서버 (c5.xlarge): ~₩150,000/월 (공유)
  - Docker/Firecracker 인스턴스: 세션당 ~₩50~200
  - 디스크 (git clone): 세션당 ~₩10~50
  - DB/로그 스토리지: 유저당 ~₩500/월

마진 보호 장치:
  - per-request budget cap (RequestBudget)
  - 일일 실행 횟수 제한 (위 SSOT 참조)
  - 토큰 burst 감지 → 자동 throttle
  - 세션 TTL 만료 시 자동 정리
```

---

## 11.3 KRW 가격표 (YUAN 에이전트 포함)

> ⚠️ 플랜별 가격, 일일 실행, 병렬 수, 보안 스캔 등 수치는 **섹션 11.2 SSOT 테이블**을 참조하세요.

```
모바일 앱스토어 가격 (수수료 포함):
  iOS:  Pro ₩19,900 / Biz ₩49,900 / Ent ₩199,000 (Apple 30% → 2년차 15%)
  Play: Pro ₩16,900 / Biz ₩44,900 / Ent ₩169,000 (Google 15%)
  웹 직결제: 토스 Payments (PG 3.3%) → 가격 동일
```

---

## 11.4 통합 기능 비교표 (YUAN vs 경쟁사)

```
+─────────────+───────────────────────────────+─────────────+──────────────+─────────+
│  카테고리    │             기능               │ Claude Code │    Codex     │  YUAN   │
+─────────────+───────────────────────────────+─────────────+──────────────+─────────+
│ 코어        │ 파일 읽기/쓰기/편집            │ O           │ O            │ 필수    │
│             │ Shell 실행 (샌드박스)          │ O           │ O            │ 필수    │
│             │ Grep/Glob 검색                │ O           │ O            │ 필수    │
│             │ Git 연동                      │ O           │ O            │ 필수    │
+─────────────+───────────────────────────────+─────────────+──────────────+─────────+
│ 추론        │ 스트리밍 출력                  │ O           │ O            │ 필수    │
│             │ 멀티모델 라우팅                │ X(Claude만) │ X(GPT만)     │ 차별화  │
│             │ Deep Thinking                 │ O           │ X            │ O       │
│             │ 실시간 Interrupted 복구        │ O           │ X            │ 필수    │
+─────────────+───────────────────────────────+─────────────+──────────────+─────────+
│ 에이전트    │ 병렬 서브에이전트 (DAG)        │ O(7개)      │ O(무제한)    │ 필수    │
│             │ Error Recovery Loop           │ O           │ O            │ 필수    │
│             │ 자동 수정 루프 (Error Recovery)│ O           │ O            │ 필수    │
│             │ 메인-서브 에이전트 검증         │ O           │ X            │ 차별화  │
│             │ Git Worktree 격리             │ O           │ O            │ 필수    │
│             │ YUA 자체 호출 (MCP)           │ X           │ X            │ 차별화  │
+─────────────+───────────────────────────────+─────────────+──────────────+─────────+
│ 보안        │ 추론 기반 보안 스캔            │ O(별도)     │ X            │ 내장    │
│             │ 시크릿/PII 자동 감지           │ O           │ 제한적       │ 필수    │
│             │ OWASP LLM Top 10 대응         │ O           │ 일부         │ 필수    │
│             │ 에이전트 감사 로그             │ O           │ O            │ 필수    │
│             │ 컴플라이언스 (PIPA/ISMS)       │ X           │ X            │ 차별화  │
│             │ 자동 패치 제안                 │ O           │ X            │ 필수    │
│             │ AI Blame (코드 출처)           │ X           │ X            │ 차별화  │
│             │ 실시간 행동 모니터링            │ X           │ X            │ 차별화  │
│             │ 제로 트러스트 파이프라인         │ X           │ X            │ 차별화  │
+─────────────+───────────────────────────────+─────────────+──────────────+─────────+
│ 메모리      │ 프로젝트 메모리 (CLAUDE.md식)  │ O           │ O(AGENTS.md) │ 필수    │
│             │ YUAN.md 프로젝트 인식          │ O(CLAUDE.md)│ O(AGENTS.md) │ 필수    │
│             │ 세션 저장/복구 (resume)        │ O(제한)     │ X            │ 필수    │
│             │ 자동 메모리 학습               │ O           │ X            │ 차별화  │
│             │ Context Compaction            │ O           │ O            │ 필수    │
│             │ 워킹 메모리 (세션)             │ O           │ O            │ 필수    │
│             │ 임베딩 기반 검색               │ X           │ X            │ 차별화  │
+─────────────+───────────────────────────────+─────────────+──────────────+─────────+
│ MCP         │ 외부 툴 연결                   │ O(300+)     │ O            │ 필수    │
│             │ 커스텀 MCP 서버                │ O           │ O            │ Phase 2 │
│             │ YUA를 MCP 서버로 노출          │ X           │ X            │ 차별화  │
+─────────────+───────────────────────────────+─────────────+──────────────+─────────+
│ 스킬/커맨드 │ /commit, /review-pr 등         │ O           │ X            │ 필수    │
│             │ /security-scan                │ O(별도)     │ X            │ 필수    │
│             │ 커스텀 슬래시 커맨드           │ O           │ X            │ Phase 2 │
+─────────────+───────────────────────────────+─────────────+──────────────+─────────+
│ 플랫폼      │ CLI                           │ O           │ O            │ Phase 2 │
│             │ Web UI                        │ X           │ O(웹)        │ Phase 1 │
│             │ Desktop (Electron)            │ X           │ O(앱)        │ Phase 2 │
│             │ Mobile                        │ X           │ X            │ 차별화  │
│             │ SDK (JS/Python)               │ X           │ O            │ Phase 1 │
│             │ CI/CD 통합                    │ X           │ X            │ Phase 2 │
│             │ Git Hooks                     │ O           │ X            │ Phase 2 │
+─────────────+───────────────────────────────+─────────────+──────────────+─────────+
│ 과금        │ 5시간 윈도우                   │ O           │ O            │ 필수    │
│             │ 크레딧 기반                    │ X           │ O            │ 필수    │
│             │ 토스 PG (한국 결제)            │ X           │ X            │ 차별화  │
+─────────────+───────────────────────────────+─────────────+──────────────+─────────+
```

---

## 12. 차별화 전략

### 12.1 vs Claude Code

| 항목 | Claude Code | YUAN Agent |
|------|-------------|------------|
| 실행 환경 | 로컬 CLI | 클라우드 (웹/데스크톱/모바일/CLI/SDK) |
| 설치 | npm install 필요 | 브라우저에서 바로 |
| 모델 | Claude 전용 | 멀티모델 (Claude+GPT+Gemini) |
| 병렬 처리 | 단일 | DAG 병렬 (최대 8 에이전트) |
| 팀 협업 | 불가 | 워크스페이스 기반 실시간 공유 |
| 비용 | $20/mo (Claude Pro) | $20/mo (더 많은 기능) |
| Git 통합 | 로컬 git만 | GitHub/GitLab PR 자동 생성 |
| 시각화 | 터미널 텍스트 | DAG 실시간 시각화 |
| SDK | 없음 | JS/Python SDK 제공 |

### 12.2 vs Codex CLI

| 항목 | Codex CLI | YUAN Agent |
|------|-----------|------------|
| 실행 환경 | 로컬 CLI | 클라우드 + CLI 겸용 |
| 모델 | GPT 전용 | 멀티모델 |
| 샌드박스 | 로컬 Docker | 서버 Docker (관리 불필요) |
| 승인 시스템 | 터미널 Y/N | 웹 UI + 상세 diff 뷰 |
| 상태 시각화 | 없음 | DAG + diff + 실시간 |

### 12.3 vs Cursor / Windsurf

| 항목 | Cursor/Windsurf | YUAN Agent |
|------|-----------------|------------|
| 타입 | IDE (VSCode fork) | 독립 에이전트 |
| 결합도 | 에디터 종속 | 에디터 무관 |
| CLI 자동화 | 제한적 | SDK/CLI 완전 지원 |
| 팀 기능 | 제한적 | 워크스페이스 네이티브 |
| 가격 | $20/mo | $20/mo |

### 12.4 vs Devin

| 항목 | Devin | YUAN Agent |
|------|-------|------------|
| 포지셔닝 | 풀타임 AI 개발자 | 개발자 도구 |
| 가격 | $500/mo | $20-30/mo |
| 자율성 | 완전 자율 | 반자율 (승인 시스템) |
| 대상 | 기업 | 개인~기업 |

---

## 13. DB 스키마

### 13.1 PostgreSQL 테이블

```sql
-- 에이전트 세션
CREATE TABLE agent_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL,
  workspace_id UUID NOT NULL,
  thread_id INTEGER REFERENCES chat_threads(id),

  -- 프로젝트 소스
  source_type TEXT NOT NULL,           -- 'git' | 'upload' | 'workspace'
  repo_url TEXT,
  branch TEXT,
  commit_hash TEXT,

  -- 상태
  status TEXT NOT NULL DEFAULT 'initializing',
  work_dir TEXT,

  -- 리소스
  total_tokens_used INTEGER DEFAULT 0,
  total_iterations INTEGER DEFAULT 0,
  total_tool_calls INTEGER DEFAULT 0,
  wall_time_ms INTEGER DEFAULT 0,

  -- 결과
  files_changed TEXT[],                -- 변경된 파일 목록
  diff_summary TEXT,
  termination_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ               -- TTL
);

-- 에이전트 실행 로그 (iteration별)
CREATE TABLE agent_iterations (
  id BIGSERIAL PRIMARY KEY,
  session_id UUID REFERENCES agent_sessions(id) ON DELETE CASCADE,
  iteration_index INTEGER NOT NULL,

  -- LLM 호출
  model TEXT NOT NULL,
  input_tokens INTEGER,
  output_tokens INTEGER,
  reasoning_tokens INTEGER,
  duration_ms INTEGER,

  -- 도구 호출
  tool_calls JSONB,                    -- [{tool, input, output, durationMs}]

  -- LLM 응답
  assistant_content TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- DAG 실행 (Phase 2)
CREATE TABLE agent_dags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES agent_sessions(id) ON DELETE CASCADE,

  -- DAG 구조
  plan JSONB NOT NULL,                 -- AgentPlan

  -- 상태
  status TEXT NOT NULL DEFAULT 'running',
  tasks_total INTEGER,
  tasks_completed INTEGER DEFAULT 0,
  tasks_failed INTEGER DEFAULT 0,

  -- 충돌
  conflicts JSONB,                     -- ConflictResolution[]

  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 인덱스
CREATE INDEX idx_agent_sessions_user ON agent_sessions(user_id, created_at DESC);
CREATE INDEX idx_agent_sessions_workspace ON agent_sessions(workspace_id);
CREATE INDEX idx_agent_sessions_status ON agent_sessions(status) WHERE status = 'running';
CREATE INDEX idx_agent_iterations_session ON agent_iterations(session_id, iteration_index);
```

---

## 14. API 엔드포인트

### 14.1 라우트 설계

```typescript
// yua-backend/src/routes/agent-router.ts

// 세션 관리
POST   /api/agent/session              // 프로젝트 세션 생성 (clone + init)
GET    /api/agent/session/:id          // 세션 상태 조회
DELETE /api/agent/session/:id          // 세션 종료 + cleanup

// 에이전트 실행
POST   /api/agent/run                  // 단일 에이전트 실행 (Phase 1)
POST   /api/agent/dag                  // DAG 병렬 실행 (Phase 2)
POST   /api/agent/stop                 // 실행 중지

// 실시간 스트리밍
GET    /api/agent/stream/:sessionId    // SSE 스트리밍

// 승인
POST   /api/agent/approve/:actionId    // 승인
POST   /api/agent/reject/:actionId     // 거부

// 결과
GET    /api/agent/diff/:sessionId      // 변경 diff 조회
POST   /api/agent/apply/:sessionId     // 변경 사항 적용 (git commit)
POST   /api/agent/pr/:sessionId        // PR 생성

// SDK/Platform API
POST   /api/v1/agent/run               // SDK용 (API Key 인증)
POST   /api/v1/agent/dag               // SDK용 DAG 실행
```

### 14.2 요청/응답 스키마

```typescript
// POST /api/agent/session
interface CreateSessionRequest {
  source:
    | { type: "git"; repoUrl: string; branch?: string }
    | { type: "upload"; fileIds: string[] }
    | { type: "workspace"; projectId: string };
}

interface CreateSessionResponse {
  ok: true;
  session: {
    id: string;
    status: "initializing";
    workDir: string;
    projectStructure: {
      language: string;
      framework: string;
      fileCount: number;
      tree: string;
    };
  };
}

// POST /api/agent/run
interface RunAgentRequest {
  sessionId: string;
  goal: string;                        // 자연어 목표
  model?: ModelTier;                   // 기본: 플랜별 자동 선택
  maxIterations?: number;              // 기본: 플랜별 한도
  autoApprove?: ApprovalAction[];      // 자동 승인 설정
}

interface RunAgentResponse {
  ok: true;
  runId: string;
  streamUrl: string;                   // SSE 스트리밍 URL
}
```

---

## 15. 외부 사용 방식 (자동화 도구)

```typescript
// YUAN을 자동화 도구로 사용하는 방법

/**
 * YUAN은 웹/모바일 UI뿐 아니라,
 * CLI/SDK/MCP/CI 파이프라인에서 자동화 도구로 사용 가능.
 */

// ─── 1. CLI (npx yuan) ───
// Phase 2에서 출시. Claude Code / Codex CLI처럼 터미널에서 직접 사용.
//
// npx yuan "이 프로젝트의 모든 console.log 제거해줘"
// npx yuan --model sonnet "API 엔드포인트에 에러 핸들링 추가"
// npx yuan resume --last
// npx yuan blame src/api/users.ts
// npx yuan security-scan --deep
// npx yuan diff  (에이전트가 변경한 파일 diff)
// npx yuan commit  (에이전트 변경사항 커밋)
//
// 인증:
//   YUAN_API_KEY=yua_... npx yuan "..."
//   또는 yuan login (OAuth 브라우저 플로우)

// ─── 2. SDK (JS/Python) ───
// 이미 yua-sdk (npm) / yua (PyPI) 배포됨. 에이전트 기능 추가.
//
// TypeScript:
import YUA from "yua-sdk";
const yua = new YUA({ apiKey: "yua_..." });

// 단일 에이전트 실행
const result = await yua.agent.run({
  project: "https://github.com/user/repo",
  goal: "Fix all TypeScript errors",
  stream: true,
  onEvent: (e) => console.log(e.kind),
});

// 세션 복구
const resumed = await yua.agent.resume(result.sessionId);

// 보안 스캔
const scan = await yua.agent.securityScan({
  project: "https://github.com/user/repo",
  mode: "deep",
});

// Python:
// from yua import YUA
// yua = YUA(api_key="yua_...")
// result = yua.agent.run(project="...", goal="...")

// ─── 3. MCP 서버 ───
// YUAN을 MCP 서버로 노출 → 다른 AI 도구에서 YUAN 에이전트 호출
//
// npx yuan-mcp-server  (stdio transport)
//
// Claude Code에서:
// .claude/settings.json:
// { "mcpServers": { "yuan": { "command": "npx", "args": ["yuan-mcp-server"] } } }
//
// → Claude Code 안에서 "YUAN 에이전트에게 보안 스캔 시켜줘" 가능

// ─── 4. CI/CD 파이프라인 ───
// GitHub Actions / GitLab CI에서 자동 코드 리뷰 + 보안 스캔
//
// .github/workflows/yuan-review.yml:
// - name: YUAN Code Review
//   uses: yuaone/yuan-action@v1
//   with:
//     api-key: ${{ secrets.YUAN_API_KEY }}
//     mode: review           # review | security-scan | fix
//     auto-fix: true         # 자동 수정 PR 생성
//
// GitLab CI:
// yuan-scan:
//   script: npx yuan security-scan --ci --output junit

// ─── 5. Git Hooks ───
// pre-commit hook으로 보안 스캔 자동화
//
// .yuan/hooks/pre-commit:
//   npx yuan security-scan --quick --changed-only
//   (변경 파일만 빠르게 스캔, 취약점 발견 시 커밋 차단)

// ─── 6. Webhook / API ───
// 이벤트 기반 자동화
//
// POST /api/agent/webhook
// {
//   "event": "github.pull_request.opened",
//   "action": "auto_review",
//   "config": { "mode": "security-scan", "autoComment": true }
// }
// → PR 열리면 자동으로 YUAN이 코드 리뷰 + 보안 스캔 + 코멘트
```

---

## 16. 롤아웃 로드맵

### Phase 1 — 단일 코딩 에이전트 (2-3주)

```
Week 1:
  [ ] Tool Runtime 구현 (file_read, file_write, file_edit, shell_exec, grep, glob)
  [ ] Agent Loop 엔진 (LLM tool use → execute → loop)
  [ ] Project Session 관리 (git clone, TTL, cleanup)
  [ ] SSE 스트리밍 (agent:* events)

Week 2:
  [ ] agent-router.ts (session CRUD + run + stream)
  [ ] 시스템 프롬프트 최적화
  [ ] git_ops, code_search, test_run 도구 추가
  [ ] 승인 시스템 (PendingAction)

Week 3:
  [ ] yua-web Agent Panel UI
  [ ] Diff Viewer 컴포넌트
  [ ] 플랜별 제한 적용
  [ ] 부하 테스트 + 안정화
```

### Phase 2 — 병렬 에이전트 (3-4주)

```
Week 4-5:
  [ ] Governor 분류 로직
  [ ] 파일 의존관계 분석 (import graph)
  [ ] DAG 생성 + 병렬 실행 엔진
  [ ] 충돌 감지 & 3-way merge

Week 6-7:
  [ ] DAG SSE 이벤트 (dag:* events)
  [ ] DAG Visualization UI (yua-web)
  [ ] SDK 에이전트 API 추가 (@yuaone/yuan-sdk)
  [ ] Python SDK 에이전트 API 추가
  [ ] CLI 에이전트 명령 (`npx yuan code`)
```

### Phase 3 — 프로덕션 (4-6주)

```
Week 8-9:
  [ ] Docker 샌드박스 구현
  [ ] 보안 정책 (명령어 필터, 파일 접근 제어)
  [ ] GitHub/GitLab 연동 (OAuth + PR 자동 생성)

Week 10-11:
  [ ] 비용 모니터링 대시보드
  [ ] per-request budget 실시간 적용
  [ ] 모바일/데스크톱 Agent Panel
  [ ] 성능 최적화 (컨텍스트 압축, 모델 라우팅)

Week 12-13:
  [ ] 부하 테스트 (동시 100 세션)
  [ ] 보안 감사
  [ ] 베타 출시
  [ ] 문서화 + SDK 가이드
```

---

## 부록 A: 파일 구조 (예상)

```
yua-backend/src/agent/
  agent-loop.ts                        // Agentic loop 코어
  agent-router.ts                      // Express 라우터
  governor.ts                          // 작업 분류 + 계획
  project-session.ts                   // 프로젝트 세션 관리
  parallel-executor.ts                 // DAG 병렬 실행 (Phase 2)
  dependency-analyzer.ts               // 파일 의존관계 분석
  conflict-resolver.ts                 // 충돌 감지/해결
  git-integration.ts                   // Git 연동
  model-selector.ts                    // 작업별 모델 선택
  approval-manager.ts                  // 승인 시스템

  tools/
    file-read.ts
    file-write.ts
    file-edit.ts
    shell-exec.ts
    grep.ts
    glob.ts
    git-ops.ts
    code-search.ts
    test-run.ts
    tool-registry.ts                   // 도구 등록/디스패치

  sandbox/
    docker-sandbox.ts                  // Docker 컨테이너 관리 (Phase 3)
    security-policy.ts                 // 보안 정책
    resource-monitor.ts                // 리소스 사용량 모니터링

  stream/
    agent-stream-emitter.ts            // SSE 이벤트 발행
    dag-stream-emitter.ts              // DAG SSE 이벤트

yua-web/src/components/agent/
  AgentPanel.tsx                       // 에이전트 실행 패널
  AgentToolCall.tsx                    // 도구 호출 표시
  DiffViewer.tsx                       // Diff 뷰어
  DAGVisualization.tsx                 // DAG 시각화 (Phase 2)
  ApprovalDialog.tsx                   // 승인 다이얼로그
  AgentSessionList.tsx                 // 세션 목록

yua-shared/src/agent/
  tool.types.ts                        // 도구 타입
  agent-event.types.ts                 // SSE 이벤트 타입
  agent-session.types.ts               // 세션 타입
  agent-plan.types.ts                  // DAG 계획 타입
```

---

## 부록 B: 경쟁사 가격 비교 (2026.03 기준)

```
+------------------+----------+----------------------------------+
| 서비스            | 가격      | 포함 기능                        |
+------------------+----------+----------------------------------+
| Claude Code      | $20/mo   | 로컬 CLI, Claude 전용             |
| Claude Max       | $100/mo  | 5x 사용량, Claude 전용            |
| Codex CLI        | $20/mo   | 로컬 CLI, GPT 전용               |
| Cursor Pro       | $20/mo   | IDE + 에이전트, 멀티모델          |
| Windsurf Pro     | $15/mo   | IDE + 에이전트                   |
| Devin             | $500/mo  | 풀 자율 에이전트                  |
| GitHub Copilot   | $19/mo   | IDE 자동완성 + Chat              |
| YUA PRO (목표)   | $20/mo   | 클라우드 + CLI + SDK + 멀티모델   |
+------------------+----------+----------------------------------+
```
