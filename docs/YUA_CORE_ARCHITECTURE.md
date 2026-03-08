# YUA Core Architecture Design Document

> **Version:** 1.0
> **Date:** 2026-03-08
> **Status:** Design Draft
> **Scope:** DAG Task System, Context Compaction, Parallel Agent Orchestration, Permission/Approval, Auth/Plan Integration, Causal Reasoning, Search, Tool System, UI Agent

---

## 목차

1. [DAG (Directed Acyclic Graph) Task System](#1-dag-task-system)
2. [Context Compaction System](#2-context-compaction-system)
3. [Parallel Agent Orchestration & Conflict Resolution](#3-parallel-agent-orchestration--conflict-resolution)
4. [Permission & Approval System](#4-permission--approval-system)
5. [Auth Integration Design](#5-auth-integration-design)
6. [Plan Integration Design](#6-plan-integration-design)
7. [Causal Reasoning Engine](#7-causal-reasoning-engine)
8. [Search System Design](#8-search-system-design)
9. [Tool System Design](#9-tool-system-design)
10. [UI Agent Design](#10-ui-agent-design)

---

## 1. DAG Task System

### 1.1 개요

Governor가 사용자 의도를 분석한 후, Planner가 작업을 DAG(Directed Acyclic Graph) 형태로 분해한다.
DAG의 각 노드는 독립된 실행 단위(TaskNode)이며, 의존 관계가 없는 노드는 병렬로 실행된다.

### 1.2 TaskNode 타입 정의

```typescript
// yua-shared/src/task/task-node.types.ts

// SSOT: SideEffectLevel은 이 Core Architecture 문서가 단일 정의 원본입니다.
// 다른 문서(Agent/Tool, Workflow 등)에서는 이 정의를 참조만 하고 재정의하지 마세요.
export type SideEffectLevel = "none" | "read" | "write" | "shell" | "network" | "deploy";

export type RetryPolicy = {
  maxAttempts: number;           // 최대 재시도 횟수
  backoffMs: number;             // 재시도 간격 (ms)
  backoffMultiplier: number;     // 지수 백오프 배수
  retryableFailures: FailureType[];  // 재시도 가능한 실패 유형
};

export type FailureType =
  | "TRANSIENT"          // 일시적 API 실패, 타임아웃
  | "TOOL_MISUSE"        // 잘못된 명령, 잘못된 파라미터
  | "LOGIC_ERROR"        // 코드/추론 자체 오류
  | "CONTEXT_LOSS"       // 필요한 맥락 누락
  | "SPEC_MISMATCH"      // 요구사항 오해
  | "VALIDATION_FAIL"    // 테스트/품질 기준 미달
  | "CONFLICT_FAIL";     // 에이전트 간 결과 충돌

export type SuccessCriteria = {
  type: "structural" | "semantic" | "both";
  structural?: {
    outputSchemaValid: boolean;
    filesMustExist?: string[];
    commandMustSucceed?: boolean;
  };
  semantic?: {
    goalAchieved: boolean;
    regressionFree?: boolean;
    qualityThreshold?: number;    // 0.0 ~ 1.0
  };
};

export type TaskNode = {
  id: string;                          // UUID
  graphId: string;                     // 소속 DAG ID
  goal: string;                        // 이 노드가 달성해야 할 목표 (자연어)
  dependencies: string[];              // 선행 TaskNode ID 목록
  inputSchema: Record<string, unknown>; // 입력 JSON Schema
  outputSchema: Record<string, unknown>; // 출력 JSON Schema
  allowedTools: string[];              // 사용 허가된 tool 목록
  sideEffectLevel: SideEffectLevel;    // 부작용 수준
  retryPolicy: RetryPolicy;
  successCriteria: SuccessCriteria;
  assignedAgent?: string;              // 실행 담당 에이전트 유형
  estimatedTokens?: number;            // 예상 토큰 비용
  timeout?: number;                    // ms 단위 타임아웃
  priority?: number;                   // 0(최저) ~ 10(최고)
};

export type TaskEdge = {
  from: string;   // source TaskNode ID
  to: string;     // target TaskNode ID
  type: "dependency" | "data_flow" | "approval_gate";
};

export type TaskGraph = {
  id: string;
  traceId: string;
  threadId: number;
  userId: number;
  workspaceId: string;
  userGoal: string;             // 원래 사용자 요청
  nodes: TaskNode[];
  edges: TaskEdge[];
  status: "planned" | "running" | "completed" | "failed" | "cancelled";
  createdAt: string;
  updatedAt: string;
};

export type TaskExecutionStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped"
  | "cancelled";

// Per-request 비용 캡 (CRITICAL: 멀티에이전트 DAG 실행 시 단일 요청 폭주 방지)
export type RequestBudget = {
  maxTotalTokens: number;        // 요청 전체 토큰 한도 (planFeatureLimits.totalRequestBudget)
  maxAgents: number;             // 동시 에이전트 수 한도 (planFeatureLimits.maxParallelAgents)
  maxToolCalls: number;          // 도구 호출 횟수 한도
  maxWallTimeMs: number;         // 벽시계 시간 한도 (ms)
  warningThreshold: number;      // 경고 기준 (0.0~1.0, 예: 0.8 = 80% 도달 시 경고)
};

// Executor는 각 TaskNode 실행 전 남은 budget을 검사하고,
// 초과 시 해당 노드를 SKIPPED 처리하고 Governor에게 보고한다.

export type TaskExecution = {
  id: string;
  nodeId: string;
  graphId: string;
  status: TaskExecutionStatus;
  agentId?: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  error?: {
    type: FailureType;
    message: string;
    stack?: string;
    toolOutput?: string;
  };
  attempt: number;
  startedAt?: string;
  completedAt?: string;
  tokensUsed?: number;
  costUsd?: number;
};
```

### 1.3 DAG 실행 엔진

```text
실행 흐름:

1. Planner가 사용자 요청을 분석하여 TaskGraph 생성
2. Topological Sort로 실행 순서 결정
3. 의존성이 충족된 노드를 병렬 실행 큐에 투입
4. 각 노드는 Executor (Worker Agent)에 할당
5. 노드 완료 시 후속 노드의 의존성 충족 여부 재평가
6. 모든 노드 완료 또는 복구 불가 실패 시 종료

Topological Sort Algorithm:
- Kahn's algorithm (BFS 기반)
- 동일 레벨 노드는 priority 기준 정렬
- 순환 의존성 탐지 시 즉시 실패 + Governor에 보고

병렬 실행 정책:
- 플랜별 max_parallel_agents 제한 적용 (FREE: 1, PRO: 3, BUSINESS: 6, ENTERPRISE: 12)
- 동일 파일 대상 write 노드는 직렬화 강제
- side_effect_level이 "deploy"인 노드는 단독 실행
```

```typescript
// yua-backend/src/ai/task/dag-executor.ts (설계)

interface DAGExecutor {
  /** TaskGraph를 받아 실행을 시작한다 */
  execute(graph: TaskGraph, budget: ExecutionBudget): Promise<DAGResult>;

  /** Topological sort로 실행 레벨을 분리한다 */
  topologicalSort(nodes: TaskNode[], edges: TaskEdge[]): TaskNode[][];

  /** 현재 실행 가능한 노드를 반환한다 */
  getReadyNodes(
    nodes: TaskNode[],
    edges: TaskEdge[],
    completed: Set<string>
  ): TaskNode[];

  /** 실패 노드 처리: Recovery 정책에 따라 재시도/건너뛰기/중단 */
  handleFailure(
    node: TaskNode,
    execution: TaskExecution,
    graph: TaskGraph
  ): "retry" | "skip" | "abort" | "replan";
}

type ExecutionBudget = {
  maxTokens: number;
  maxCostUsd: number;
  maxTimeMs: number;
  maxParallelAgents: number;
};

type DAGResult = {
  graphId: string;
  status: "completed" | "partial" | "failed";
  completedNodes: string[];
  failedNodes: string[];
  skippedNodes: string[];
  totalTokens: number;
  totalCostUsd: number;
  elapsedMs: number;
};
```

### 1.4 DB 테이블 스키마

```sql
-- PostgreSQL

CREATE TABLE task_graphs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id      TEXT NOT NULL,
  thread_id     INTEGER NOT NULL REFERENCES chat_threads(id),
  user_id       INTEGER NOT NULL,
  workspace_id  TEXT NOT NULL,
  user_goal     TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'planned'
                CHECK (status IN ('planned','running','completed','failed','cancelled')),
  plan_tier     TEXT NOT NULL DEFAULT 'free',
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE task_nodes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  graph_id          UUID NOT NULL REFERENCES task_graphs(id) ON DELETE CASCADE,
  goal              TEXT NOT NULL,
  input_schema      JSONB DEFAULT '{}',
  output_schema     JSONB DEFAULT '{}',
  allowed_tools     TEXT[] DEFAULT '{}',
  side_effect_level TEXT NOT NULL DEFAULT 'none'
                    CHECK (side_effect_level IN ('none','read','write','shell','network','deploy')),
  retry_policy      JSONB NOT NULL DEFAULT '{"maxAttempts":3,"backoffMs":1000,"backoffMultiplier":2,"retryableFailures":["TRANSIENT"]}',
  success_criteria  JSONB NOT NULL DEFAULT '{"type":"structural","structural":{"outputSchemaValid":true}}',
  assigned_agent    TEXT,
  estimated_tokens  INTEGER,
  timeout_ms        INTEGER DEFAULT 120000,
  priority          INTEGER DEFAULT 5,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE task_edges (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  graph_id  UUID NOT NULL REFERENCES task_graphs(id) ON DELETE CASCADE,
  from_node UUID NOT NULL REFERENCES task_nodes(id) ON DELETE CASCADE,
  to_node   UUID NOT NULL REFERENCES task_nodes(id) ON DELETE CASCADE,
  edge_type TEXT NOT NULL DEFAULT 'dependency'
            CHECK (edge_type IN ('dependency','data_flow','approval_gate')),
  UNIQUE (from_node, to_node)
);

CREATE TABLE task_executions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id       UUID NOT NULL REFERENCES task_nodes(id) ON DELETE CASCADE,
  graph_id      UUID NOT NULL REFERENCES task_graphs(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','running','completed','failed','skipped','cancelled')),
  agent_id      TEXT,
  input         JSONB DEFAULT '{}',
  output        JSONB,
  error         JSONB,
  attempt       INTEGER NOT NULL DEFAULT 1,
  tokens_used   INTEGER DEFAULT 0,
  cost_usd      NUMERIC(10,6) DEFAULT 0,
  started_at    TIMESTAMPTZ,
  completed_at  TIMESTAMPTZ
);

CREATE INDEX idx_task_nodes_graph ON task_nodes(graph_id);
CREATE INDEX idx_task_edges_graph ON task_edges(graph_id);
CREATE INDEX idx_task_executions_node ON task_executions(node_id);
CREATE INDEX idx_task_executions_graph ON task_executions(graph_id);
CREATE INDEX idx_task_graphs_thread ON task_graphs(thread_id);
CREATE INDEX idx_task_graphs_user ON task_graphs(user_id);
```

---

## 2. Context Compaction System

### 2.1 개요

긴 대화, 장기 세션, 다중 에이전트 트레이스에서 컨텍스트 길이를 제어한다.
정보를 버리는 것이 아니라 "압축 + 재주입 가능 상태"로 유지하며, 모델 입력 토큰을 안정적으로 제한하면서 작업 연속성을 보존한다.

### 2.2 계층적 압축 구조 (L0-L5)

```text
L0: System / Policies / Safety        [절대 손상 금지]
    - system prompt
    - safety rules
    - tool permissions
    - immutable policies
    - AGENTS.md / repo instructions

L1: Active Task State                  [현재 진행 중인 작업]
    - current task graph (DAG)
    - active node status
    - unresolved blockers
    - pending approval requests

L2: Pinned Facts                       [구조적으로 보존해야 할 사실]
    - confirmed decisions
    - constraints / prohibitions
    - important entities (file paths, IDs, names)
    - user goals (original + refined)
    - project conventions

L3: Recent Conversation Window         [최근 N개 turn 원문 유지]
    - 최근 대화 원문
    - 최근 tool 실행 결과 (축약)
    - 최근 에이전트 판단 근거

L4: Summarized History                 [요약된 과거 대화]
    - 대화 요약 블록
    - 과거 결정 사항
    - 이전 실패 및 원인
    - compact summary JSON

L5: Archived Traces                    [외부 메모리 전용]
    - raw tool stdout/stderr
    - full patch/diff history
    - 상세 에이전트 트레이스
    - 원본 대화 로그
    - DB/vector store에만 존재, 컨텍스트에 주입하지 않음
```

### 2.3 압축 발동 조건

```typescript
// yua-backend/src/ai/compress/compaction-trigger.ts (설계)

type CompactionTrigger = {
  /** 전체 컨텍스트 토큰이 soft limit 초과 */
  tokenLimitExceeded: boolean;       // total_tokens > soft_limit (plan별 상이)

  /** 세션 길이가 기준 초과 */
  sessionLengthExceeded: boolean;    // turns > max_turns_before_compact

  /** 에이전트 트레이스가 누적 기준 초과 */
  traceAccumulation: boolean;        // trace_entries > max_trace_entries

  /** 반복 tool 로그가 기준 초과 */
  toolLogOverflow: boolean;          // raw_tool_output_tokens > threshold

  /** 백그라운드 태스크 상태가 과도하게 누적 */
  backgroundStateOverflow: boolean;  // background_task_count > threshold
};

// 플랜별 soft limit 예시
const COMPACTION_SOFT_LIMITS: Record<Plan, number> = {
  FREE: 8_000,
  PRO: 32_000,
  BUSINESS: 64_000,
  ENTERPRISE: 120_000,
};
```

### 2.4 압축 알고리즘

```text
Compaction 절차:

1. [유지] L0 system/policy/safety 블록 전체 유지
2. [유지] L1 active plan / current task / unresolved issues 유지
3. [유지] L2 pinned facts (decisions, constraints, entities) 유지
4. [유지] L3 최근 N개 turn 원문 유지 (N = plan별 설정)
5. [압축] 오래된 대화를 summary block으로 변환
6. [축약] tool stdout/stderr → structured result로 축약
7. [참조화] patch/diff/decision/failure → artifact reference로 대체
8. [검증] compact 후 semantic drift 검증
9. [검증] compact summary와 최근 원문 간 contradiction 검사
10. [실패처리] unresolved issue가 요약에서 누락되면 compaction 실패로 간주

출력:
compacted_context = [L0 + L2 + L1 + L4(summary) + L3(recent turns)]
```

### 2.5 compact_context 스키마

```typescript
// yua-shared/src/compact/compact-context.types.ts (설계)

export type CompactMode = "conservative" | "balanced" | "aggressive";

export type CompactSummary = {
  sessionId: string;
  summaryVersion: number;
  userGoals: string[];
  confirmedDecisions: string[];
  constraints: string[];
  openIssues: string[];
  importantEntities: string[];       // file paths, IDs, names
  recentCompletedSteps: string[];
  previousFailures: { step: string; reason: string }[];
  nextExpectedAction: string;
  droppedTurnRange: [number, number]; // [startTurn, endTurn]
  compactedAt: string;               // ISO timestamp
};

export type CompactContext = {
  system: string;                     // L0: system prompt 원문
  pinnedFacts: string[];              // L2: pinned facts
  activeTaskState: string;            // L1: 현재 작업 상태 요약
  summary: CompactSummary;            // L4: 압축된 과거 대화
  recentTurns: Array<{               // L3: 최근 대화 원문
    role: "user" | "assistant" | "system";
    content: string;
    turnIndex: number;
  }>;
  retrievalHints: string[];           // L5 참조 시 사용할 검색 힌트
  totalTokens: number;                // 압축 후 총 토큰 수
  compactMode: CompactMode;
};
```

### 2.6 기존 메모리 시스템과의 통합

```text
현재 메모리 시스템 (yua-backend/src/ai/memory/):
- memory-manager.ts        → 메모리 CRUD, commit, retrieve
- memory-store.ts          → PostgreSQL + pgvector 저장소
- memory-retriever.ts      → 벡터 검색 기반 메모리 조회
- memory-auto-commit.ts    → 자동 메모리 커밋 엔진
- memory-dedup.ts          → 중복 메모리 제거
- memory-merge.engine.ts   → 메모리 병합

통합 방식:
1. L5 archived traces → memory-store에 저장 (vector embedding 포함)
2. L2 pinned facts → MemoryScope "project_decision" + "project_architecture"로 커밋
3. L4 summary → MemoryScope "user_research"로 저장 (세션 요약)
4. compaction 발동 시 memory-retriever로 관련 메모리 주입 (L5 → L3 승격 가능)
5. memory-auto-commit의 기존 규칙을 compaction trigger와 연동
6. 기존 MemoryScope 6종 (user_profile, user_preference, user_research,
   project_architecture, project_decision, general_knowledge) 유지
7. compact_summary는 별도 테이블 (compact_contexts) 또는 메모리 항목으로 저장
```

### 2.7 DB 스키마

```sql
CREATE TABLE compact_contexts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id       INTEGER NOT NULL REFERENCES chat_threads(id),
  session_id      TEXT NOT NULL,
  user_id         INTEGER NOT NULL,
  compact_mode    TEXT NOT NULL DEFAULT 'balanced'
                  CHECK (compact_mode IN ('conservative','balanced','aggressive')),
  summary         JSONB NOT NULL,          -- CompactSummary
  pinned_facts    JSONB DEFAULT '[]',
  retrieval_hints TEXT[] DEFAULT '{}',
  dropped_turn_range INT4RANGE,
  total_tokens    INTEGER NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_compact_thread ON compact_contexts(thread_id);
CREATE INDEX idx_compact_session ON compact_contexts(session_id);
```

---

## 3. Parallel Agent Orchestration & Conflict Resolution

### 3.1 Governor / Lead Agent

```text
Governor의 역할:
- 전체 목표(global objective) 추적
- 실행 정책 결정 (예산, 시간, 품질 밸런스)
- Agent Router를 통한 에이전트 선택 및 할당
- 충돌 감지 및 해결
- 중간 실패 시 재계획(replan) 여부 결정
- stop / continue / rollback 판정
- 메모리 커밋 승인

Governor는 "똑똑한 상위 모델"이 아니라
전체 실행 정책을 결정하는 컨트롤 타워이다.
```

```typescript
// yua-backend/src/ai/agent/governor.types.ts (설계)

export type GovernorDecision =
  | { action: "route"; agents: AgentAssignment[] }
  | { action: "replan"; reason: string; failedNodes: string[] }
  | { action: "abort"; reason: string }
  | { action: "continue" }
  | { action: "rollback"; toNodeId: string }
  | { action: "escalate"; reason: string; requiresHuman: boolean };

export type AgentAssignment = {
  agentType: AgentType;
  nodeId: string;
  model: string;
  budget: AgentBudget;
};

export type AgentType =
  | "governor"
  | "knowledge"
  | "coding"
  | "data"
  | "automation"
  | "multimodal"
  | "memory"
  | "validator"
  | "recovery"
  | "ui"
  | "designer";

export type AgentBudget = {
  maxTokens: number;
  maxTimeMs: number;
  maxToolCalls: number;
  maxCostUsd: number;
};
```

### 3.2 Worker Agent 생명주기

```text
Worker Agent Lifecycle:

1. SPAWN
   - Governor가 TaskNode를 Worker에 할당
   - AgentBudget 설정
   - 허용 도구 목록 주입
   - 입력 데이터 전달

2. INITIALIZE
   - 컨텍스트 구성 (compacted context + node-specific data)
   - 도구 권한 확인
   - heartbeat 시작

3. EXECUTE
   - LLM 호출 + tool 실행 루프
   - 중간 결과 StreamEngine으로 전송
   - 예산 소진 감시

4. VALIDATE
   - SuccessCriteria 검증 (structural + semantic)
   - 실패 시 RetryPolicy에 따라 재시도 또는 Recovery Agent 호출

5. REPORT
   - 결과를 Governor에 보고
   - output_schema 준수 여부 확인

6. TERMINATE
   - heartbeat 중지
   - 사용 리소스 정산 (tokens, cost, time)
   - 메모리 커밋 후보 제출
```

### 3.3 충돌 감지

```typescript
// yua-backend/src/ai/agent/conflict-detector.types.ts (설계)

export type ConflictType =
  | "file_conflict"          // 동일 파일을 여러 에이전트가 수정
  | "fact_conflict"          // 상충되는 사실 주장
  | "api_contract_mismatch"  // 인터페이스/타입 불일치
  | "duplicate_work"         // 동일 작업 중복 수행
  | "resource_contention"    // 동일 외부 리소스 동시 접근
  | "schema_divergence";     // 출력 스키마 불일치

export type Conflict = {
  id: string;
  type: ConflictType;
  agentA: string;            // 충돌 당사자 A
  agentB: string;            // 충돌 당사자 B
  nodeA: string;             // TaskNode A
  nodeB: string;             // TaskNode B
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  detectedAt: string;
  resolved: boolean;
  resolution?: ConflictResolution;
};

export type ConflictResolution = {
  strategy: "merge" | "priority" | "human_escalation" | "rollback_one" | "rollback_both";
  winnerId?: string;           // priority 전략 시 우선 에이전트
  mergedResult?: unknown;      // merge 전략 시 병합 결과
  humanDecision?: string;      // human escalation 시 사람 판정 기록
  resolvedAt: string;
  resolvedBy: "governor" | "human" | "automatic";
};
```

### 3.4 충돌 해결 전략

```text
충돌 해결 전략 매트릭스:

file_conflict:
  - 동일 파일 다른 영역 수정 → 3-way merge 시도
  - 동일 영역 수정 → priority 기반 (higher priority node 우선)
  - merge 실패 → human escalation

fact_conflict:
  - 근거(evidence) 비교 → confidence 높은 쪽 채택
  - confidence 동일 → Governor가 추가 검증 요청
  - 검증 불가 → 양측 모두 표시 + 사용자에게 선택 요청

api_contract_mismatch:
  - yua-shared 계약과 비교 → 계약 준수 쪽 채택
  - 양측 모두 계약 미준수 → Governor replan

duplicate_work:
  - 먼저 완료된 결과 채택
  - 나중 실행 노드 취소 (cancel)

resource_contention:
  - 직렬화 큐에 넣어 순차 실행
  - 타임아웃 시 후순위 노드 건너뛰기
```

### 3.5 Agent Heartbeat & Health 모니터링

```typescript
// yua-backend/src/ai/agent/agent-health.types.ts (설계)

export type AgentHeartbeat = {
  agentId: string;
  nodeId: string;
  graphId: string;
  status: "alive" | "stalled" | "dead";
  tokensUsed: number;
  toolCallsMade: number;
  elapsedMs: number;
  lastActivityAt: string;       // ISO timestamp
  progressPercent?: number;     // 0 ~ 100 (에이전트 자체 추정)
};

// 건강 검사 정책
export type HealthPolicy = {
  heartbeatIntervalMs: number;        // heartbeat 전송 간격 (기본: 5000)
  stallThresholdMs: number;           // 이 시간 동안 진전 없으면 stalled (기본: 30000)
  deadThresholdMs: number;            // 이 시간 동안 heartbeat 없으면 dead (기본: 60000)
  onStalled: "warn" | "restart" | "abort";
  onDead: "restart" | "abort" | "escalate";
};
```

### 3.6 예산 제어

```text
Budget Control Points:

1. Governor Level (전체 예산)
   - total_token_budget
   - total_cost_budget
   - total_time_budget
   - max_parallel_agents

2. Per-Agent Level (에이전트별 예산)
   - agent_token_budget
   - agent_time_budget
   - agent_tool_call_budget
   - agent_cost_budget

3. 예산 초과 시 처리:
   - 70% 소진 → Governor에 경고
   - 90% 소진 → 현재 작업 마무리 후 추가 할당 요청 또는 중단
   - 100% 소진 → 강제 중단, 부분 결과 반환

4. 비용 회계:
   - 각 에이전트의 실제 token 사용량 실시간 추적
   - model별 input/output 단가 적용
   - tool 호출 비용 (외부 API) 별도 추적
```

---

## 4. Permission & Approval System

### 4.1 권한 수준 (Permission Levels)

```typescript
// yua-shared/src/permission/permission.types.ts (설계)

// ⚠️ SSOT: 리소스 접근 수준 (SideEffectLevel과 대응)
// Agent/Tool 문서의 AuthenticationLevel("PUBLIC"|"AUTHENTICATED"|"ELEVATED"|"ADMIN")과 구분됨
// PermissionLevel = "무엇을 할 수 있는가" (capability)
// AuthenticationLevel = "누가 접근할 수 있는가" (identity)
export type PermissionLevel =
  | "read_only"    // 파일 읽기, 검색만 허용
  | "write"        // 파일 쓰기 허용
  | "shell"        // 셸 명령 실행 허용
  | "network"      // 외부 네트워크 요청 허용
  | "deploy";      // 배포/프로덕션 변경 허용

export type PermissionGrant = {
  level: PermissionLevel;
  scope: string;                // 적용 범위 (예: "project:yua-web", "file:/src/**", "tool:web_search")
  grantedBy: "plan" | "role" | "approval" | "policy";
  expiresAt?: string;           // 일시적 권한의 만료 시각
};
```

### 4.2 역할 기반 접근 제어 (RBAC)

```text
Role Permission Matrix:

                  read_only  write  shell  network  deploy
viewer            O          X      X      X        X
member (user)     O          O      X      O*       X
admin             O          O      O      O        X
owner             O          O      O      O        O*

* member의 network: 검색용만 허용, 임의 API 호출 제한
* owner의 deploy: approval 프로세스 필수

WorkspaceRole (기존 yua-shared): "owner" | "admin" | "member"
추가 필요: "viewer" role
```

### 4.3 플랜 기반 권한

```text
Plan Permission Matrix:

                    FREE      PRO        BUSINESS    ENTERPRISE
read_only           O         O          O           O
write               O         O          O           O
shell               X         O*         O           O
network             O(basic)  O          O           O
deploy              X         X          O*          O
parallel_agents     1         3          6           12
tool_call_limit     4         12         24          50
retrieval_rounds    1         3          5           8
compaction_mode     aggressive balanced  conservative conservative
memory_retention    short     medium     long        very_long

* PRO shell: safe commands only (lint, test, build)
* BUSINESS deploy: staging only, production은 ENTERPRISE
```

### 4.4 승인 요청 흐름 (Approval Flow)

```typescript
// yua-shared/src/permission/approval.types.ts (설계)

export type ApprovalRequest = {
  id: string;
  threadId: number;
  graphId?: string;
  nodeId?: string;
  requestedBy: string;            // agent ID
  action: ProposedAction;
  riskLevel: "low" | "medium" | "high" | "critical";
  reason: string;                  // 왜 이 작업이 필요한지
  alternatives?: string[];         // 대안 제안
  status: "pending" | "approved" | "denied" | "modified";
  reviewedBy?: number;             // user ID
  reviewedAt?: string;
  modifiedAction?: ProposedAction; // 수정된 액션 (modified 시)
  createdAt: string;
  expiresAt: string;               // 자동 만료 (기본: 30분)
};

export type ProposedAction = {
  type: "tool_call" | "file_write" | "shell_exec" | "network_request" | "deploy" | "memory_write";
  tool?: string;
  command?: string;
  filePath?: string;
  payload?: unknown;
  estimatedImpact: string;
};
```

```text
Approval 흐름:

1. Agent가 high-risk action 감지
   - side_effect_level >= "shell"
   - deploy 관련 작업
   - production 파일 직접 수정
   - 민감 데이터 접근

2. ApprovalRequest 생성 → SSE로 프론트에 전송

3. 사용자 검토:
   a) Approve → 에이전트 실행 계속
   b) Deny → 에이전트에 거부 사유 전달, 대안 탐색
   c) Modify → 수정된 action으로 실행

4. 자동 승인 정책 (plan/role에 따라):
   - ENTERPRISE admin: shell 자동 승인
   - 기본: deploy는 항상 수동 승인

5. 만료 처리:
   - expiresAt 도달 시 자동 deny
   - 에이전트는 대안을 찾거나 작업 중단
```

### 4.5 고위험 행동 탐지

```typescript
// yua-backend/src/ai/permission/risk-detector.ts (설계)

export type RiskSignal = {
  category: "destructive_command" | "production_access" | "sensitive_data"
           | "cost_spike" | "privilege_escalation" | "unknown_tool";
  severity: "low" | "medium" | "high" | "critical";
  evidence: string;
};

// 자동 감지 규칙 예시
const HIGH_RISK_PATTERNS = [
  { pattern: /rm\s+-rf/,          category: "destructive_command",  severity: "critical" },
  { pattern: /DROP\s+TABLE/i,     category: "destructive_command",  severity: "critical" },
  { pattern: /production|prod/i,  category: "production_access",    severity: "high" },
  { pattern: /password|secret|key/i, category: "sensitive_data",    severity: "high" },
  { pattern: /git push.*--force/, category: "destructive_command",  severity: "high" },
  { pattern: /deploy|publish/i,   category: "production_access",    severity: "high" },
];
```

### 4.6 감사 추적 (Audit Trail)

```sql
CREATE TABLE permission_audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id       INTEGER NOT NULL,
  graph_id        UUID,
  node_id         UUID,
  user_id         INTEGER NOT NULL,
  workspace_id    TEXT NOT NULL,
  agent_id        TEXT,
  action_type     TEXT NOT NULL,        -- tool_call, file_write, shell_exec, ...
  action_detail   JSONB NOT NULL,       -- 실행된 액션 상세
  permission_level TEXT NOT NULL,       -- 요구된 권한 수준
  granted         BOOLEAN NOT NULL,     -- 허용 여부
  grant_source    TEXT NOT NULL,        -- plan, role, approval, policy
  risk_level      TEXT,                 -- low, medium, high, critical
  approval_id     UUID,                 -- ApprovalRequest 참조
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_user ON permission_audit_log(user_id);
CREATE INDEX idx_audit_workspace ON permission_audit_log(workspace_id);
CREATE INDEX idx_audit_thread ON permission_audit_log(thread_id);
CREATE INDEX idx_audit_created ON permission_audit_log(created_at);
```

---

## 5. Auth Integration Design

### 5.1 기존 인증 흐름 (yua-web / yua-backend)

```text
현재 Auth SSOT:

[Client]
  Firebase Auth (Google OAuth / Email+Password)
  → Firebase ID Token 획득
  → Authorization: Bearer <firebase-id-token>

[Backend]
  requireFirebaseAuth middleware
  → firebaseAuth.verifyIdToken(token)
  → MySQL users 테이블 조회 (firebase_uid)
  → req.user = { userId, firebaseUid, email, name, role }

  withWorkspace middleware
  → x-workspace-id 헤더
  → workspace role 조회
  → 없으면 personal workspace 자동 생성
  → req.workspace = { id, role }

기존 타입 (yua-shared):
  AuthUser = { id: ID; email: string | null; name: string | null }
  AuthProfile = { user: AuthUser; workspace: Workspace; role: WorkspaceRole }
  Workspace = { id: ID; name: string; plan: Tier }
  Tier = "free" | "pro" | "business" | "enterprise"
  WorkspaceRole = "owner" | "admin" | "member"
```

### 5.2 yua-platform 인증 흐름 (개발자 계정)

```text
Platform Auth (개발자/API 소비자용):

[Platform Client]
  Firebase Auth (동일)
  → 일반 사용자와 동일한 로그인
  → platform_developer 플래그 확인

[Backend]
  requireFirebaseAuth (동일)
  → isPlatformDeveloper(userId) 확인
  → platform_api_keys 테이블 조회
  → req.platformDeveloper = { userId, apiKeyCount, plan }

Platform Developer 등록:
  POST /platform/register
  → 기존 계정에 platform_developer 플래그 추가
  → Terms of Service 동의 필수
```

### 5.3 API Key 인증 (Platform API 소비자)

```text
API Key Auth (Platform API 소비자가 사용):

[외부 소비자]
  x-api-key: <platform-api-key>

[Backend]
  requireApiKeyAuth middleware
  → SHA-256(key) → platform_api_keys 테이블 조회
  → 만료/폐기 확인
  → req.apiConsumer = { keyId, developerId, plan, permissions }

API Key 구조:
  - prefix: "yua_" + environment("live_" | "test_")
  - key body: 32 byte random hex
  - 저장 시: SHA-256 hash
  - 표시 시: "yua_live_****...last4"
```

### 5.4 Cross-package Auth 계약 (yua-shared 확장)

```typescript
// yua-shared/src/auth/auth-types.ts (확장 설계)

// 기존 유지
export type AuthUser = {
  id: ID;
  email: string | null;
  name: string | null;
};

export type AuthProfile = {
  user: AuthUser;
  workspace: Workspace;
  role: WorkspaceRole;
};

// 추가: Platform 인증
export type PlatformDeveloper = {
  userId: number;
  isPlatformDeveloper: boolean;
  apiKeyCount: number;
  plan: Tier;
  registeredAt: string;
};

// 추가: API Key 인증
export type ApiConsumer = {
  keyId: string;
  developerId: number;
  plan: Tier;
  permissions: PermissionLevel[];
  rateLimit: number;     // requests per minute
};

// 추가: 통합 Auth Context
export type AuthContext = {
  type: "firebase" | "api_key";
  user?: AuthUser;
  workspace?: Workspace;
  role?: WorkspaceRole;
  platformDeveloper?: PlatformDeveloper;
  apiConsumer?: ApiConsumer;
  plan: Tier;
  permissions: PermissionLevel[];
};
```

### 5.5 인증 흐름 다이어그램

```text
yua-web (일반 사용자):
  Firebase Auth → ID Token → requireFirebaseAuth → withWorkspace → AuthContext(type: "firebase")

yua-platform (개발자):
  Firebase Auth → ID Token → requireFirebaseAuth → withWorkspace → isPlatformDeveloper → AuthContext(type: "firebase")

Platform API (외부 소비자):
  API Key → requireApiKeyAuth → AuthContext(type: "api_key")

yua-mobile:
  Firebase Auth (Google Sign-In / Email) → ID Token → 동일 backend 흐름

공통:
  AuthContext → Plan 확인 → Permission 확인 → Governor Budget 설정
```

---

## 6. Plan Integration Design

### 6.1 플랜 계층 (Plan Tiers)

```typescript
// yua-shared/src/plan/plan.types.ts (확장 설계)

export type Plan = "FREE" | "PRO" | "BUSINESS" | "ENTERPRISE";

// 기존 Tier와 Plan 매핑
// Tier("free" | "pro" | "business" | "enterprise") → Plan 변환은 tierToPlan()

export type PlanFeatureLimits = {
  // 모델 관련
  defaultModel: string;
  codingModel: string;
  fastModel: string;
  hardReasoningModel?: string;

  // 병렬 에이전트
  maxParallelAgents: number;

  // 도구 관련
  maxToolCallsPerRequest: number;

  // 검색 관련
  maxRetrievalRounds: number;

  // 추론 관련
  reasoningDepth: "low" | "medium" | "medium-high" | "high";

  // 컨텍스트 압축
  compactionMode: CompactMode;

  // 메모리 보존
  memoryRetention: "short" | "medium" | "long" | "very_long";

  // 토큰 예산
  inputTokenBudget: number;
  outputTokenBudget: number;
  reasoningBudget: number;
  totalRequestBudget: number;

  // 기능 접근
  deepResearch: boolean;
  heavyCodingAgent: boolean;
  longRunningAutomation: boolean;
  multimodalBatchAnalysis: boolean;
  imageGeneration: boolean;
  customPolicies: boolean;
};

export const PLAN_FEATURE_LIMITS: Record<Plan, PlanFeatureLimits> = {
  FREE: {
    defaultModel: "fast",
    codingModel: "fast",
    fastModel: "fast",
    maxParallelAgents: 1,
    maxToolCallsPerRequest: 4,
    maxRetrievalRounds: 1,
    reasoningDepth: "low",
    compactionMode: "aggressive",
    memoryRetention: "short",
    inputTokenBudget: 12_000,
    outputTokenBudget: 3_000,
    reasoningBudget: 2_000,
    totalRequestBudget: 20_000,
    deepResearch: false,
    heavyCodingAgent: false,
    longRunningAutomation: false,
    multimodalBatchAnalysis: false,
    imageGeneration: false,
    customPolicies: false,
  },
  PRO: {
    defaultModel: "standard",
    codingModel: "standard",
    fastModel: "fast",
    maxParallelAgents: 3,
    maxToolCallsPerRequest: 12,
    maxRetrievalRounds: 3,
    reasoningDepth: "medium",
    compactionMode: "balanced",
    memoryRetention: "medium",
    inputTokenBudget: 48_000,
    outputTokenBudget: 8_000,
    reasoningBudget: 8_000,
    totalRequestBudget: 72_000,
    deepResearch: true,
    heavyCodingAgent: true,
    longRunningAutomation: false,
    multimodalBatchAnalysis: false,
    imageGeneration: true,
    customPolicies: false,
  },
  BUSINESS: {
    defaultModel: "standard",
    codingModel: "standard",
    fastModel: "fast",
    hardReasoningModel: "reasoning",
    maxParallelAgents: 6,
    maxToolCallsPerRequest: 24,
    maxRetrievalRounds: 5,
    reasoningDepth: "medium-high",
    compactionMode: "conservative",
    memoryRetention: "long",
    inputTokenBudget: 96_000,
    outputTokenBudget: 16_000,
    reasoningBudget: 20_000,
    totalRequestBudget: 140_000,
    deepResearch: true,
    heavyCodingAgent: true,
    longRunningAutomation: true,
    multimodalBatchAnalysis: true,
    imageGeneration: true,
    customPolicies: false,
  },
  ENTERPRISE: {
    defaultModel: "standard",
    codingModel: "standard",
    fastModel: "fast",
    hardReasoningModel: "reasoning",
    maxParallelAgents: 12,
    maxToolCallsPerRequest: 50,
    maxRetrievalRounds: 8,
    reasoningDepth: "high",
    compactionMode: "conservative",
    memoryRetention: "very_long",
    inputTokenBudget: 160_000,
    outputTokenBudget: 24_000,
    reasoningBudget: 40_000,
    totalRequestBudget: 240_000,
    deepResearch: true,
    heavyCodingAgent: true,
    longRunningAutomation: true,
    multimodalBatchAnalysis: true,
    imageGeneration: true,
    customPolicies: true,
  },
};
```

#### Model Registry — 실제 모델 매핑

```typescript
// yua-shared/src/plan/model-registry.ts (설계)
// ⚠️ SSOT: 모든 문서/코드에서 모델명은 이 추상 alias를 사용
// 실제 모델은 여기서만 매핑하며, 모델 업그레이드 시 이 파일만 변경

export const MODEL_REGISTRY = {
  fast: "gpt-4o-mini",           // 빠른 응답, 간단한 작업
  standard: "gpt-4o",            // 범용 주력 모델
  reasoning: "o1",               // 복잡한 추론, 수학, 코딩
  premium: "gpt-4.5-preview",    // 최고 품질 (ENTERPRISE 전용)
} as const;

export type ModelTier = keyof typeof MODEL_REGISTRY;
```

### 6.2 플랜 적용 지점 (Enforcement Points)

```text
Plan Enforcement Points:

1. Governor (에이전트 오케스트레이션)
   - max_parallel_agents 확인
   - reasoning_depth 설정
   - model 선택 제한

2. Executor (실행 엔진)
   - total_request_budget 확인
   - tool_call 횟수 제한
   - timeout 설정

3. Tool Router (도구 라우터)
   - allowed tools 필터링
   - image_generation 가능 여부
   - deep_research 가능 여부

4. Compaction Engine (압축 엔진)
   - compaction_mode 설정
   - memory_retention 기간 설정

5. Billing Middleware (과금)
   - credit 잔액 확인
   - 초과 사용 차단 또는 경고
```

### 6.3 yua-web 플랜 UI

```text
yua-web Plan UI 구성:

1. 현재 플랜 표시
   - 사이드바 하단 또는 설정 페이지
   - 플랜 이름 + 잔여 크레딧/사용량 게이지

2. 업그레이드 프롬프트
   - 기능 제한에 도달했을 때 인라인 프롬프트
   - "PRO로 업그레이드하면 병렬 에이전트 3개까지 사용 가능합니다"
   - 비침습적, 작업 흐름 방해 최소화

3. 사용량 대시보드
   - 일별/월별 토큰 사용량
   - tool 호출 횟수
   - 에이전트 실행 횟수
   - 잔여 예산 표시
```

### 6.4 yua-platform 플랜 UI

```text
yua-platform Plan UI 구성:

1. API 사용량 대시보드
   - API 호출 횟수 / 토큰 사용량 차트
   - 모델별 사용 비중
   - 일별/주별/월별 트렌드

2. 크레딧 잔액
   - 현재 잔액 표시
   - 충전 / 자동 충전 설정
   - 사용 한도 경고 설정

3. Rate Limit 현황
   - 현재 분당 요청 한도
   - 실시간 사용률 게이지
```

---

## 7. Causal Reasoning Engine

### 7.1 Intent Classification

```typescript
// yua-backend/src/ai/reasoning/intent-classifier.types.ts (설계)

export type IntentCategory =
  | "question"        // 정보 요청 (검색, 설명, 비교)
  | "execution"       // 실행 요청 (코드 작성, 파일 수정, 명령 실행)
  | "analysis"        // 분석 요청 (데이터 분석, 코드 리뷰, 문서 분석)
  | "generation"      // 생성 요청 (문서, 보고서, 이미지, 코드)
  | "automation"      // 자동화 요청 (워크플로우, 반복 작업, 배포)
  | "hybrid";         // 복합 요청 (검색+분석+생성 등)

export type IntentClassification = {
  primary: IntentCategory;
  secondary?: IntentCategory;
  confidence: number;               // 0.0 ~ 1.0
  requiresSearch: boolean;          // 웹/문서 검색 필요 여부
  requiresExecution: boolean;       // 코드/명령 실행 필요 여부
  requiresApproval: boolean;        // 사용자 승인 필요 여부
  estimatedComplexity: "simple" | "moderate" | "complex" | "multi_step";
  suggestedAgents: AgentType[];     // 투입 추천 에이전트
};
```

### 7.2 Causal Chain (인과 추론 체인)

```text
Causal Chain Flow:

User Intent (원래 요청)
  ↓
Goal Decomposition (목표 분해)
  - 단일 목표 or 복합 목표 분리
  - 각 하위 목표의 선행 조건 파악
  ↓
Agent Selection (에이전트 선택)
  - intent category → 최적 에이전트 매핑
  - plan 제한 내 에이전트 조합 결정
  ↓
Tool Selection (도구 선택)
  - 각 에이전트가 사용할 도구 결정
  - 도구 권한 확인
  ↓
Execution Plan (실행 계획)
  - TaskGraph (DAG) 생성
  - 의존성 분석
  - 병렬 가능 구간 식별
  ↓
Execution + Validation (실행 + 검증)
  ↓
Response Composition (응답 구성)
```

### 7.3 Evidence-based Reasoning (근거 기반 추론)

```typescript
// yua-backend/src/ai/reasoning/evidence.types.ts (설계)

export type EvidenceSource = {
  type: "web" | "document" | "memory" | "tool_result" | "user_input" | "inference";
  url?: string;
  title?: string;
  snippet: string;
  retrievedAt: string;
  freshness: "real_time" | "recent" | "cached" | "stale";
  trustScore: number;          // 0.0 ~ 1.0
};

export type EvidencedClaim = {
  claim: string;               // 주장 내용
  confidence: number;          // 0.0 ~ 1.0
  sources: EvidenceSource[];   // 근거 목록
  isLoadBearing: boolean;      // 핵심 주장 여부 (citation 대상)
};

export type ReasoningTrace = {
  traceId: string;
  steps: ReasoningStep[];
  finalConclusion: string;
  overallConfidence: number;
  unresolvedQuestions: string[];
};

export type ReasoningStep = {
  step: number;
  action: string;              // "search", "analyze", "infer", "validate"
  input: string;
  output: string;
  evidence?: EvidenceSource[];
  confidence: number;
  durationMs: number;
};
```

### 7.4 Counterfactual Analysis (반사실적 분석)

```text
Counterfactual Analysis 사용 시점:

1. 복합 의사결정 지원
   - "A를 하면 어떻게 될까?" → A 시나리오 + 대안 시나리오 비교
   - 각 시나리오의 예상 결과, 리스크, 비용 분석

2. 코드 변경 영향 분석
   - "이 리팩토링을 하지 않으면?" → 기술 부채 누적 시나리오
   - "다른 방식으로 구현하면?" → 대안 구현 비교

3. Governor의 replan 판단
   - 실패 시 "다른 접근 방식을 취했다면?" 분석
   - 대안 경로 탐색 → 비용/시간/품질 비교

구현 방식:
- 별도 LLM 호출로 counterfactual 시나리오 생성
- PRO 이상 플랜에서만 활성화
- 결과는 evidence 형태로 최종 응답에 포함
```

---

## 8. Search System Design

### 8.1 Multi-source Search

```typescript
// yua-backend/src/ai/search/search.types.ts (설계)

export type SearchSource =
  | "web"              // 웹 검색 (Bing/Google API)
  | "internal_docs"    // 업로드된 문서 (pgvector RAG)
  | "uploaded_files"   // 현재 세션에 첨부된 파일
  | "memory"           // 메모리 스토어
  | "connector";       // 외부 연동 (Google Drive, Notion, GitHub 등)

export type SearchQuery = {
  original: string;            // 원래 사용자 질문
  rewritten: string[];         // 검색 최적화된 재작성 쿼리
  language: string;            // 쿼리 언어
  timeSensitive: boolean;      // 최신 정보 필요 여부
  sources: SearchSource[];     // 검색 대상 소스
  maxResults: number;          // 소스당 최대 결과 수
};

export type SearchResult = {
  source: SearchSource;
  title: string;
  url?: string;
  snippet: string;
  fullContent?: string;
  score: number;               // 0.0 ~ 1.0 (relevance)
  freshness: "real_time" | "recent" | "cached" | "stale";
  publishedAt?: string;
  retrievedAt: string;
};

export type SearchResponse = {
  queryId: string;
  results: SearchResult[];
  totalFound: number;
  searchDurationMs: number;
  sourcesQueried: SearchSource[];
};
```

### 8.2 Query Rewriting

```text
Query Rewriting 전략:

1. 검색 친화형 재작성
   - 대화체 → 키워드 중심 변환
   - 예: "Next.js에서 SSR 하는 법 알려줘" → "Next.js SSR server side rendering tutorial"

2. 다국어 확장
   - 한국어 질문 → 영어 검색어 추가 생성
   - 예: "리액트 상태관리" → ["react state management", "리액트 상태관리 라이브러리"]

3. 시간 민감성 반영
   - "최신 Node.js 버전" → "Node.js latest version 2026"
   - freshness filter 활성화

4. 의도 세분화
   - "React vs Vue" → ["react advantages", "vue advantages", "react vue comparison 2026"]
```

### 8.3 Source Ranking & Reranking

```text
Ranking 기준 (가중치):

1. Query Relevance (0.35)
   - 쿼리와 결과의 의미적 유사도
   - vector similarity + keyword match 혼합

2. Source Trust (0.25)
   - 공식 문서 > 기술 블로그 > 포럼 > 일반 웹
   - trust score DB 관리

3. Freshness (0.20)
   - 최신 정보일수록 높은 점수
   - 시간 민감 쿼리일 때 가중치 증가

4. Content Depth (0.10)
   - snippet 길이, 구조화 정도
   - 코드 예제 포함 여부

5. Diversity (0.10)
   - 동일 출처 중복 감점
   - 다양한 관점 포함 보너스

Reranking:
- 1차 검색 결과를 LLM에 전달하여 재정렬
- PRO 이상 플랜에서 활성화
- 상위 K개 결과만 최종 컨텍스트에 주입
```

### 8.4 Citation Builder

```text
Citation 생성 규칙:

1. Load-bearing claim (핵심 주장)에만 citation 부착
   - "React 18은 concurrent rendering을 지원합니다 [1]"
   - 일반적 사실/상식에는 citation 불필요

2. Per-sentence evidence linking
   - 각 문장이 어떤 source에서 왔는지 추적
   - EvidencedClaim 구조로 관리

3. Citation 포맷
   - 인라인: [1], [2], ...
   - 하단 참조: [1] 제목 - URL
   - 신뢰도 표시: [1] (high confidence) / [2] (moderate)

4. 상충 정보 처리
   - 동일 주제에 상충 근거가 있으면 양측 모두 표시
   - "A 측 관점 [1] vs B 측 관점 [2]" 형태
```

### 8.5 Freshness Detection

```text
Freshness Detection 규칙:

1. 시간 민감 키워드 감지
   - "최신", "현재", "오늘", "이번 달", "2026년"
   - "latest", "current", "today", "this year"
   - 날짜/시간 관련 엔티티 포함

2. 빠르게 변하는 주제 감지
   - 기술 버전 (Node.js, React, Python 등)
   - 주가, 환율, 날씨
   - 법률, 정책 변경사항

3. 대응:
   - freshness_required = true → 웹 검색 강제
   - cached 결과 사용 금지
   - 결과에 "기준일" 명시
```

### 8.6 기존 RAG (pgvector) 통합

```text
현재 RAG 인프라:
- yua-backend/src/ai/memory/memory-store.ts → pgvector 기반 벡터 저장
- yua-backend/src/ai/search/ → deep-web-fetch, multi-hop-crawler, url-fetcher
- yua-backend/src/db/postgres.ts → pgvector extension

통합 방식:
1. internal_docs 검색 → 기존 pgvector RAG 파이프라인 활용
2. uploaded_files 검색 → 파일 업로드 시 embedding 생성 → pgvector 저장
3. memory 검색 → memory-retriever.ts 활용
4. web 검색 → 기존 deep-web-fetch + url-fetcher 확장
5. 모든 검색 결과를 통합 SearchResult 형태로 정규화
```

---

## 9. Tool System Design

### 9.1 도구 레지스트리 & 디스커버리

```typescript
// yua-shared/src/tool/tool-registry.types.ts (설계)

export type ToolCategory =
  | "file"          // 파일 읽기/쓰기/분석
  | "shell"         // 셸 명령 실행
  | "web"           // 웹 검색/크롤링/API 호출
  | "code"          // 코드 분석/생성/테스트
  | "data"          // 데이터 분석/시각화
  | "image"         // 이미지 이해/생성
  | "automation"    // 외부 서비스 연동
  | "memory";       // 메모리 CRUD

export type ToolDefinition = {
  id: string;                      // 고유 식별자 (예: "web_search")
  name: string;                    // 표시 이름
  description: string;             // 도구 설명 (LLM에 노출)
  category: ToolCategory;
  version: string;
  inputSchema: Record<string, unknown>;   // JSON Schema
  outputSchema: Record<string, unknown>;  // JSON Schema
  sideEffectLevel: SideEffectLevel;
  requiredPermission: PermissionLevel;
  requiredPlan: Plan;              // 최소 플랜 요구사항
  timeout: number;                 // ms
  costPerCall?: number;            // USD (외부 API 호출 비용)
  isBuiltIn: boolean;              // 내장 도구 여부
};

export type ToolRegistry = {
  /** 모든 등록된 도구 목록 */
  listAll(): ToolDefinition[];

  /** 카테고리로 필터링 */
  listByCategory(category: ToolCategory): ToolDefinition[];

  /** 플랜 + 역할 기반 사용 가능 도구 필터링 */
  listAvailable(plan: Plan, role: WorkspaceRole): ToolDefinition[];

  /** 도구 ID로 조회 */
  get(id: string): ToolDefinition | null;

  /** 도구 등록 */
  register(tool: ToolDefinition): void;
};
```

### 9.2 기존 도구 (YuaToolType) 유지 + 신규 도구

```text
기존 도구 (yua-shared/src/tool/yua-tool.types.ts):
  FILE_ANALYZER, TABLE_EXTRACTOR, DATA_TRANSFORM, PII_REDACTOR,
  SQL_RUNNER, API_CALLER, SCHEMA_EXPLORER, WEB_DEEP_FETCH,
  PROVENANCE_BUILDER, POLICY_CHECKER, GRAPH_EXTRACTOR,
  DECISION_SIMULATOR, SEMANTIC_MEMORY_QUERY, REPORT_COMPOSER

신규 도구 (추가 필요):
  1. web_search        - 웹 검색 (Bing/Google API)
  2. image_generate    - 이미지 생성 (DALL-E / Stable Diffusion)
  3. code_sandbox      - 격리 코드 실행 환경 (Python/JS)
  4. data_analyze      - 구조적 데이터 분석 (통계, 프로파일링)
  5. doc_read          - 문서 읽기 (PDF, DOCX, PPTX)
  6. shell_exec        - 셸 명령 실행 (safe command list)
  7. git_ops           - Git 작업 (diff, commit, branch)
  8. connector_call    - 외부 서비스 호출 (Slack, Notion, GitHub API)
  9. chart_generate    - 차트/시각화 생성
  10. memory_query     - 기존 SEMANTIC_MEMORY_QUERY 확장
```

### 9.3 Tool Permission Matrix

```text
Tool Permission Matrix (Plan x Tool):

                    FREE    PRO     BUSINESS  ENTERPRISE
file_analyzer       O       O       O         O
table_extractor     O       O       O         O
web_search          O(1/req) O(3)   O(5)      O(8)
web_deep_fetch      X       O       O         O
doc_read            O       O       O         O
data_analyze        X       O       O         O
code_sandbox        X       O       O         O
image_generate      X       O       O         O
shell_exec          X       O*      O         O
git_ops             X       O       O         O
chart_generate      X       O       O         O
connector_call      X       X       O         O
sql_runner          X       X       O         O
report_composer     X       O       O         O
decision_simulator  X       X       O         O

* PRO shell_exec: safe commands only (lint, test, build, ls, cat)
```

### 9.4 Tool Result 표준화

```typescript
// 기존 yua-shared/src/tool/yua-tool-result.types.ts 확장

export type ToolResultStatus = "success" | "partial" | "error" | "timeout" | "denied";

export type ToolResult<T = unknown> = {
  toolId: string;
  status: ToolResultStatus;
  data?: T;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
  provenance?: {
    source: string;
    retrievedAt: string;
    freshness: string;
  };
  tokensUsed: number;
  durationMs: number;
  costUsd?: number;
};
```

### 9.5 Tool 에러 처리 및 복구

```text
Tool Error Recovery 전략:

1. TRANSIENT (일시적 실패)
   - 자동 재시도 (exponential backoff)
   - 최대 3회
   - 3회 실패 시 Recovery Agent에 위임

2. TOOL_MISUSE (잘못된 사용)
   - 에러 메시지를 LLM에 전달
   - 파라미터 수정 후 재시도
   - 2회 연속 misuse 시 Governor에 보고

3. TIMEOUT
   - timeout 2배 증가 후 재시도
   - plan의 최대 timeout 초과 시 중단
   - 부분 결과가 있으면 반환

4. DENIED (권한 부족)
   - ApprovalRequest 생성
   - 사용자 승인 대기 또는 대안 도구 탐색

5. RATE_LIMIT
   - 대기 시간 계산 후 재시도
   - 다른 에이전트 우선 실행으로 전환
```

---

## 10. UI Agent Design

### 10.1 Response Mode Selection (응답 모드 선택)

```typescript
// yua-shared/src/ui/response-mode.types.ts (설계)

export type ResponseMode =
  | "brief"       // 짧은 답변 (1~3문장)
  | "detailed"    // 자세한 설명 (구조화된 긴 답변)
  | "report"      // 보고서형 (제목, 섹션, 결론 구조)
  | "tutorial"    // 튜토리얼형 (단계별 가이드)
  | "checklist";  // 체크리스트형 (실행 가능한 항목 목록)

export type ResponseModeSelection = {
  mode: ResponseMode;
  reason: string;                // 왜 이 모드를 선택했는지
  userExplicit: boolean;         // 사용자가 명시적으로 요청했는지
  estimatedLength: "short" | "medium" | "long";
};

// 자동 선택 규칙
// - "간단히 알려줘" → brief
// - "자세히 설명해줘" → detailed
// - "보고서로 작성해줘" → report
// - "방법 알려줘" / "어떻게 해?" → tutorial
// - "해야 할 일 정리해줘" → checklist
// - 기본값: 질문 복잡도 기반 자동 판단
```

### 10.2 Artifact Formatting (산출물 포맷팅)

```typescript
// yua-shared/src/ui/artifact.types.ts (설계)

export type ArtifactType =
  | "document"       // 구조화된 문서
  | "table"          // 표
  | "code_block"     // 코드 블록
  | "chart"          // 차트/시각화
  | "slide_outline"  // 프레젠테이션 개요
  | "email_draft"    // 이메일 초안
  | "comparison"     // 비교표
  | "timeline"       // 타임라인
  | "checklist"      // 체크리스트
  | "diagram";       // 다이어그램 (Mermaid 등)

export type Artifact = {
  id: string;
  type: ArtifactType;
  title: string;
  content: string;               // Markdown 또는 structured data
  metadata?: Record<string, unknown>;
  downloadable: boolean;         // 다운로드 가능 여부
  editable: boolean;             // 수정 가능 여부
};
```

### 10.3 Audience Adaptation (대상 적응)

```text
Audience 유형별 적응 규칙:

1. non-developer (비개발자)
   - 기술 용어 최소화
   - 비유와 예시 활용
   - 코드 블록 대신 개념 설명
   - 시각적 구조 강조 (번호 목록, 표)

2. developer (개발자)
   - 기술 용어 그대로 사용
   - 코드 예제 포함
   - API/CLI 명령 직접 제시
   - 구현 세부사항 포함

3. executive (경영진/임원)
   - summary-first 구조
   - 핵심 수치/결론 먼저
   - 리스크/비용/일정 강조
   - 세부사항은 접을 수 있는 하위 섹션

4. customer (고객 공유용)
   - 정제된 톤
   - 전문적이지만 접근 가능한 언어
   - 브랜드 톤 일관성
   - 후속 조치 안내 포함
```

### 10.4 Visual Packaging (시각적 구성)

```text
Visual Packaging 규칙:

1. Heading/Section 구조
   - 모든 응답에 명확한 계층 구조
   - H2 → H3 → bullet 순서 유지
   - 불필요한 중첩 방지

2. Key Highlights
   - 핵심 수치/결론은 볼드 처리
   - 경고/주의는 별도 블록 (callout)
   - 성공/실패는 색상 구분 (UI 연동)

3. Progressive Disclosure
   - 요약 먼저 → 상세 나중
   - "더 보기" 패턴으로 정보 계층화
   - 코드/로그는 접을 수 있는 블록

4. 정보 밀도 조절
   - brief 모드: sparse (여백 많음)
   - detailed 모드: medium
   - report 모드: dense (compact)
```

### 10.5 Follow-up Hint Generation (후속 조치 제안)

```typescript
// yua-shared/src/ui/follow-up.types.ts (설계)

export type FollowUpHint = {
  text: string;                    // 제안 텍스트
  category: "action" | "question" | "warning" | "exploration";
  priority: number;                // 0(낮음) ~ 10(높음)
  requiresNewAgent?: boolean;      // 새 에이전트 호출 필요 여부
  estimatedCost?: "low" | "medium" | "high";
};

// 기존 SuggestionItem (yua-shared/src/types/suggestion.ts) 과 통합
// StreamEventKind "suggestion"을 통해 프론트에 전달

// 예시 생성 규칙:
// 1. 현재 작업의 자연스러운 다음 단계
//    "테스트를 실행해볼까요?"
// 2. 관련 탐색 제안
//    "관련 문서도 찾아볼까요?"
// 3. 리스크/주의점 안내
//    "이 변경은 production에 영향을 줄 수 있습니다"
// 4. 대안 제시
//    "다른 접근 방식도 비교해볼까요?"
```

---

## 부록 A: 전체 시스템 흐름도

```text
[User Request]
     │
     ▼
[Auth Layer]
  Firebase Auth / API Key
  → AuthContext (user, workspace, plan, permissions)
     │
     ▼
[Governor Agent]
  Intent Classification
  → Causal Chain 구성
  → Plan 제한 확인
  → Budget 할당
     │
     ▼
[Planner]
  Goal Decomposition
  → TaskGraph (DAG) 생성
  → Topological Sort
     │
     ▼
[DAG Executor]
  병렬 노드 실행 ──────────────┐
  │                             │
  ▼                             ▼
[Worker A]                   [Worker B]
  Tool 실행                    Tool 실행
  Heartbeat                    Heartbeat
  │                             │
  ▼                             ▼
[Validator]                  [Validator]
  Structural Check             Structural Check
  Semantic Check               Semantic Check
  │                             │
  └──────────┬──────────────────┘
             │
             ▼
[Conflict Detector]
  충돌 감지 → 해결
             │
             ▼
[Context Compaction]
  L0~L5 계층 압축 (필요 시)
             │
             ▼
[Memory Commit]
  결과를 메모리에 저장
             │
             ▼
[UI Agent]
  Response Mode 선택
  Audience Adaptation
  Artifact Formatting
  Follow-up Hints
             │
             ▼
[SSE Stream → Client]
  stage → token → activity → final → suggestion → done
```

---

## 부록 B: DB 스키마 요약

```text
신규 테이블:
  task_graphs          → DAG 메타데이터
  task_nodes           → DAG 노드 정의
  task_edges           → DAG 간선 (의존 관계)
  task_executions      → 노드 실행 이력
  compact_contexts     → 컨텍스트 압축 결과
  permission_audit_log → 권한 감사 로그

기존 테이블 확장:
  workspace_users      → viewer role 추가
  platform_api_keys    → permissions 컬럼 추가

기존 테이블 유지:
  chat_threads, chat_messages, workspaces, workspace_users,
  projects, project_members, users (MySQL)
```

---

## 부록 C: yua-shared 추가 타입 목록

```text
신규 모듈 (yua-shared/src/):

  task/
    task-node.types.ts       → TaskNode, TaskEdge, TaskGraph, TaskExecution, FailureType, etc.

  compact/
    compact-context.types.ts → CompactContext, CompactSummary, CompactMode

  permission/
    permission.types.ts      → PermissionLevel, PermissionGrant
    approval.types.ts        → ApprovalRequest, ProposedAction

  auth/ (확장)
    auth-types.ts            → PlatformDeveloper, ApiConsumer, AuthContext 추가

  plan/ (확장)
    plan.types.ts            → PlanFeatureLimits, PLAN_FEATURE_LIMITS 추가

  tool/ (확장)
    tool-registry.types.ts   → ToolCategory, ToolDefinition, ToolRegistry

  ui/
    response-mode.types.ts   → ResponseMode, ResponseModeSelection
    artifact.types.ts        → ArtifactType, Artifact
    follow-up.types.ts       → FollowUpHint

  agent/
    agent.types.ts           → AgentType, AgentBudget, AgentHeartbeat
    conflict.types.ts        → ConflictType, Conflict, ConflictResolution
    governor.types.ts        → GovernorDecision, AgentAssignment

  reasoning/
    intent.types.ts          → IntentCategory, IntentClassification
    evidence.types.ts        → EvidenceSource, EvidencedClaim, ReasoningTrace

  search/
    search.types.ts          → SearchSource, SearchQuery, SearchResult, SearchResponse
```

---

## 부록 D: 구현 우선순위

```text
Phase 1 (MVP):
  - TaskNode 타입 정의 (yua-shared)
  - DAG Executor 기본 구현 (직렬 실행)
  - Context Compaction L0~L4 구현
  - Permission 기본 검사 (plan 기반)
  - Tool Registry 기본 구현
  - 기존 auth 흐름 유지

Phase 2 (Parallel):
  - DAG 병렬 실행 구현
  - Worker Agent 생명주기 관리
  - Agent Heartbeat 모니터링
  - Conflict Detection 기본 구현
  - Approval Flow (SSE 연동)
  - Search System 통합

Phase 3 (Intelligence):
  - Causal Reasoning Engine
  - Evidence-based citation
  - Counterfactual analysis
  - UI Agent 자동 모드 선택
  - Audience Adaptation
  - Follow-up Hint Generation

Phase 4 (Enterprise):
  - Conflict Resolution 고도화
  - Custom Policy Engine
  - Organization-level shared memory
  - Advanced audit trail
  - Platform API key 고도화
  - Connector 확장 (Slack, Notion, GitHub)
```

---

> **이 문서는 YUA Core Architecture의 설계 초안이다.**
> 구현 시 yua-shared가 타입/계약의 단일 SSOT이며, 다른 패키지에서 타입을 복제/재정의하지 않는다.
> 모든 신규 타입은 yua-shared에 먼저 정의한 후 yua-backend / yua-web에서 참조한다.
