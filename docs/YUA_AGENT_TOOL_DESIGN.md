# YUA Agent & Tool System — 상세 설계 명세서

> **Version:** 1.0.0
> **Last Updated:** 2026-03-08
> **Status:** DRAFT
> **기반 문서:** YUAN_DESIGN.md (병렬 오케스트레이터 구조)

---

## 목차

1. [시스템 아키텍처 개요](#1-시스템-아키텍처-개요)
2. [에이전트 명세](#2-에이전트-명세)
3. [도구(Tool) 명세](#3-도구tool-명세)
4. [슬래시 명령 시스템](#4-슬래시-명령-시스템)
5. [공통 계약 및 타입](#5-공통-계약-및-타입)
6. [플랜별 실행 정책](#6-플랜별-실행-정책)

---

> **모델명 규칙:** 이 문서에서 모델명은 추상 tier alias를 사용합니다.
> 실제 매핑은 `MODEL_REGISTRY` (YUA_CORE_ARCHITECTURE.md §6.1) 참조.
> - `fast`: 빠른 응답 (현재: gpt-4o-mini)
> - `standard`: 범용 (현재: gpt-4o)
> - `coding`: 코딩 특화 (현재: gpt-4o)
> - `reasoning`: 복잡한 추론 (현재: o1)
> - `premium`: 최고 품질 (현재: gpt-4.5-preview)

---

## 1. 시스템 아키텍처 개요

### 1.1 실행 흐름

```
User Request
     |
     v
Governor Agent (의도 분류 + 라우팅 + 예산 할당)
     |
     v
Agent Router (DAG 기반 병렬/직렬 배치)
     |
     +---> Knowledge Agent ----+
     +---> Coding Agent -------+---> Validator Agent
     +---> Data Agent ---------+         |
     +---> Automation Agent ---+         v
     +---> Multimodal Agent ---+    [성공/실패/부분성공]
     +---> Designer Agent -----+         |
     |                              +----+----+
     v                              |         |
Memory Agent <-- 결과 저장     Recovery Agent  UI Agent
                                (실패 시)    (최종 응답)
```

### 1.2 핵심 원칙

- **역할 분리**: 각 에이전트는 단일 책임을 갖는다
- **TaskContract**: 모든 작업은 입출력 스키마, 허용 도구, side-effect 수준을 명시한다
- **FailureType 분류**: 실패는 반드시 유형별로 분류하여 복구 전략을 결정한다
- **SSOT**: 공유 타입은 `yua-shared`에서만 정의한다

### 1.3 TaskContract (모든 에이전트 간 실행 계약)

```typescript
interface TaskContract {
  id: string;                    // UUID
  goal: string;                  // 자연어 목표
  agentId: AgentId;              // 실행 에이전트
  dependencies: string[];        // 선행 task ID 목록
  inputSchema: JSONSchema;       // 입력 스키마
  outputSchema: JSONSchema;      // 출력 스키마
  allowedTools: ToolName[];      // 허용 도구 목록
  sideEffectLevel: SideEffectLevel;
  retryPolicy: RetryPolicy;
  successCriteria: string[];     // 검증 기준
  budgetLimit: BudgetLimit;      // 토큰/시간/비용 한도
  timeout: number;               // ms
}
```

---

## 2. 에이전트 명세

---

### 2.1 Governor Agent

**목적:** 사용자 의도를 해석하고, 최적의 에이전트 조합과 실행 전략을 결정하는 중앙 정책 엔진.
단순한 "상위 모델"이 아니라, 전체 실행의 제어 타워 역할을 한다.

#### 입력 스키마

```typescript
interface GovernorInput {
  userMessage: string;
  conversationHistory: Message[];
  activeMemory: MemorySnapshot;
  userTier: "free" | "pro" | "business" | "enterprise";
  attachments?: Attachment[];
  previousPlan?: ExecutionPlan;     // 재계획 시
  failureContext?: FailureReport;   // Recovery 후 재호출 시
}
```

#### 출력 스키마

```typescript
interface GovernorOutput {
  intent: IntentClassification;
  plan: AgentExecutionPlan;
  budgetAllocation: BudgetAllocation;
  responsePolicy: ResponsePolicy;
  riskAssessment: RiskLevel;
}

type IntentClassification = {
  primary: "QUESTION" | "EXECUTION" | "ANALYSIS" | "GENERATION"
         | "AUTOMATION" | "DESIGN" | "MIXED";
  subIntents: string[];
  confidence: number;
  criticality: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  domain?: "medical" | "legal" | "financial" | "general" | "code" | "data";
};

type AgentExecutionPlan = {
  stages: {
    stageId: string;
    agents: AgentId[];      // 같은 stage = 병렬 실행
    contracts: TaskContract[];
  }[];
  totalBudget: BudgetLimit;
  estimatedLatency: number;
};
```

#### 사용 가능한 도구

| 도구 | 용도 |
|------|------|
| `vector_search` | 과거 유사 요청 패턴 조회 |

> Governor는 직접 외부 도구를 호출하지 않는다. 다른 에이전트에 위임한다.

#### 권한 수준

```
LEVEL: ORCHESTRATOR (최상위)
- 모든 에이전트 spawn/stop 권한
- 예산 할당/조정 권한
- 실행 중단(abort) 권한
- 재계획(replan) 권한
- Memory write 승인 권한
```

#### 모델 정책

| 플랜 | 모델 | 근거 |
|------|------|------|
| FREE | fast | 단순 라우팅만 수행 |
| PRO | standard | 병렬 계획 + 예산 최적화 |
| BUSINESS | standard | 복잡한 multi-agent 오케스트레이션 |
| ENTERPRISE | premium | 고위험 의사결정, 장기 세션 |

#### 실패 처리

```
1. Agent 실행 실패 → FailureType 수신 → Recovery Agent 호출 여부 결정
2. 예산 초과 → 남은 작업 우선순위 재조정 또는 조기 종료
3. 충돌 발생 → 에이전트 간 결과 비교 후 우선순위 판정
4. 재계획 한도 → max 3회, 이후 사용자에게 상황 보고 + 선택지 제시
```

#### 다른 에이전트와의 연결

```
Governor → (생성) → 모든 Specialized Agent
Governor ← (실패 보고) ← Recovery Agent
Governor → (검증 요청) → Validator Agent
Governor → (최종 응답 지시) → UI Agent
Governor ← (메모리 상태) ← Memory Agent
```

#### 핵심 기능 상세

1. **Intent Classification** — 질문형/실행형/분석형/생성형/자동화형/디자인형/혼합형 분류
2. **Agent Routing Policy** — 호출 에이전트 수, 병렬 가능 여부, 저비용/고품질 경로 선택
3. **Budget Controller** — max_tokens, max_latency, max_tool_calls, max_parallel_agents, max_cost
4. **Replanning Engine** — 중간 실패 시 전체/부분 재계획, SPEC_MISMATCH시 planner 재호출
5. **Conflict Arbitration** — 에이전트 간 결과 충돌 시 우선순위 판정
6. **Response Composer Trigger** — 최종 응답 형식 결정 (요약형/상세형/보고서형/실행형)

---

### 2.2 Knowledge/Search Agent

**목적:** 웹, 내부 문서, 업로드 파일, 외부 커넥터 등 다양한 소스에서 정보를 검색하고, 신뢰할 수 있는 근거와 함께 패키징하여 반환한다.

#### 입력 스키마

```typescript
interface KnowledgeInput {
  query: string;
  queryContext?: string;          // Governor가 제공하는 추가 맥락
  sources: SearchSource[];        // ["web", "internal", "uploaded", "connector"]
  freshness: "any" | "recent" | "latest";
  maxResults: number;
  language?: string;
  rewriteEnabled: boolean;
}
```

#### 출력 스키마

```typescript
interface KnowledgeOutput {
  results: SearchResult[];
  evidence: EvidencePackage;
  citations: Citation[];
  conflictingViews?: ConflictView[];
  searchTrace: SearchTrace;       // 디버깅용
}

type EvidencePackage = {
  topEvidence: Evidence[];        // 상위 3~5개 핵심 근거
  confidence: number;
  coverageGaps: string[];         // 정보 부족 영역
};

type Citation = {
  claimText: string;
  sourceUrl: string;
  sourceTitle: string;
  relevanceScore: number;
  retrievedAt: string;            // ISO timestamp
};
```

#### 사용 가능한 도구

| 도구 | 용도 |
|------|------|
| `web_search` | 외부 웹 검색 |
| `vector_search` | 내부 지식베이스 semantic search |
| `doc_read` | PDF/문서 내용 읽기 |
| `file_read` | 업로드된 파일 읽기 |
| `browser_use` | 웹페이지 심층 탐색 |

#### 권한 수준

```
LEVEL: READ_ONLY
- 외부 정보 읽기만 허용
- 파일 시스템 쓰기 불가
- 외부 API 변경 호출 불가
```

#### 모델 정책

| 플랜 | 모델 | retrieval_rounds |
|------|------|------------------|
| FREE | fast | 1 |
| PRO | standard | 3 |
| BUSINESS | standard | 5 |
| ENTERPRISE | standard | 8 |

#### 실패 처리

```
1. 검색 결과 없음 → query rewriting 후 재시도 (max 2회)
2. 웹 검색 타임아웃 → TRANSIENT, 자동 재시도
3. 신뢰도 낮은 결과만 존재 → confidence 점수 표시 + Governor에 추가 검색 권고
4. 상충 정보 → conflictingViews로 분리하여 반환
```

#### 다른 에이전트와의 연결

```
Governor → Knowledge Agent (검색 요청)
Knowledge Agent → Validator Agent (사실 검증 요청)
Knowledge Agent → Memory Agent (검색 결과 캐시)
Knowledge Agent → UI Agent (citation 포맷팅)
Coding Agent → Knowledge Agent (기술 문서 조회)
```

#### 핵심 기능 상세

1. **Multi-Source Search** — web, internal docs, uploaded files, connectors (Drive, Notion, GitHub)
2. **Query Rewriting** — 검색 친화형 쿼리 재작성, 다국어 확장, 시간 민감성 반영
3. **Source Reranking** — 최신성, 신뢰도, 질의 적합도 기준 재정렬, 중복 제거
4. **Citation Builder** — 답변 문장별 근거 연결, load-bearing claim 위주 인용
5. **Evidence Packaging** — 핵심 근거 3~5개 추출, 상충 정보 viewpoint 분리
6. **Freshness Detection** — 최신 정보 필요 여부 감지, 웹 검색 강제 판단

---

### 2.3 Coding Agent

**목적:** 코드 저장소를 이해하고, patch 기반으로 안전하게 코드를 수정/생성/리팩토링하며, 테스트와 리뷰를 결합하여 고품질 코드를 산출한다.

#### 입력 스키마

```typescript
interface CodingInput {
  task: "generate" | "fix" | "refactor" | "review" | "test" | "explain";
  description: string;
  targetFiles?: string[];
  projectContext?: ProjectContext;  // 구조, 컨벤션, 의존성
  codeSnippets?: CodeSnippet[];
  constraints?: string[];
  framework?: string;              // "next.js" | "express" | "react" | ...
}

type ProjectContext = {
  structure: string;              // 디렉토리 트리
  conventions: string[];          // 코딩 컨벤션
  dependencies: Record<string, string>;
  testFramework?: string;
};
```

#### 출력 스키마

```typescript
interface CodingOutput {
  patches: Patch[];
  explanation: string;
  affectedFiles: string[];
  testSuggestions?: TestSuggestion[];
  risks: Risk[];
  rollbackPlan?: string;
  followUp?: string[];
}

type Patch = {
  filePath: string;
  action: "create" | "modify" | "delete";
  diff: string;                   // unified diff format
  description: string;
};
```

#### 사용 가능한 도구

| 도구 | 용도 |
|------|------|
| `file_read` | 소스 코드 읽기 |
| `file_write` | 새 파일 생성 |
| `file_edit` | patch 기반 수정 |
| `shell_exec` | lint, test, build 실행 |
| `git_ops` | diff, commit, branch 관리 |
| `code_sandbox` | 격리 환경 코드 실행 |
| `web_search` | 기술 문서/API 참조 검색 |

#### 권한 수준

```
LEVEL: READ_WRITE
- 프로젝트 내 파일 읽기/쓰기 허용
- shell 명령 실행 허용 (allowlist 기반)
- 위험 명령 차단 (rm -rf, drop database 등)
- git push는 사용자 승인 필요
```

#### 모델 정책

| 플랜 | 모델 | 근거 |
|------|------|------|
| FREE | fast | 단순 코드 생성/설명 |
| PRO | coding | 전문 코딩 모델 |
| BUSINESS | coding | + 병렬 multi-file 리팩토링 |
| ENTERPRISE | coding | + 장기 세션 코딩 워크플로우 |

#### 실패 처리

```
1. lint/build 실패 → LOGIC_ERROR, 에러 출력 분석 후 자동 수정 (max 3회)
2. 테스트 실패 → VALIDATION_FAIL, 실패 케이스 분석 후 patch 수정
3. 파일 접근 실패 → TOOL_MISUSE, 경로 재확인 후 재시도
4. 컨텍스트 부족 → CONTEXT_LOSS, 필요 파일 추가 로딩 후 재시도
```

#### 다른 에이전트와의 연결

```
Governor → Coding Agent (코드 작업 위임)
Coding Agent → Validator Agent (코드 품질 검증)
Coding Agent → Knowledge Agent (기술 문서 조회)
Coding Agent → Memory Agent (프로젝트 컨벤션 조회/저장)
Coding Agent → Recovery Agent (빌드 실패 복구)
```

#### 핵심 기능 상세

1. **Repository Awareness** — 프로젝트 구조 파악, 의존성 그래프, 기존 코드 스타일/컨벤션 파악
2. **Patch-First Editing** — 직접 overwrite 금지, diff/patch 기반 수정, 변경 파일 목록 명시
3. **Code Planning** — 수정 전 영향 범위 분석, 관련 파일 후보 추출, 테스트 영향 예측
4. **Test Coupling** — 코드 수정 후 관련 테스트 자동 생성/수정, smoke/unit/regression 제안
5. **Safe Execution** — allowlist 기반 shell 명령만 실행, 위험 명령 차단, dry-run 우선
6. **Review-Aware Output** — 변경 이유, 리스크, 롤백 포인트, follow-up 필요 여부 출력

---

### 2.4 Data/Analysis Agent

**목적:** 구조화/비구조화 데이터를 분석하고, 통계 계산, 시각화, 해석까지 수행한다. Python sandbox에서 안전하게 실행한다.

#### 입력 스키마

```typescript
interface DataAnalysisInput {
  task: "profile" | "analyze" | "visualize" | "statistics" | "transform";
  description: string;
  files?: FileRef[];              // CSV, XLSX, JSON, Parquet
  inlineData?: Record<string, unknown>[];
  analysisTemplate?: "summary" | "comparison" | "timeseries" | "cohort"
                   | "funnel" | "regression" | "custom";
  visualizations?: ChartType[];
  constraints?: string[];
}
```

#### 출력 스키마

```typescript
interface DataAnalysisOutput {
  profile?: DataProfile;
  statistics?: StatisticsResult;
  charts?: ChartArtifact[];
  interpretation: string;
  warnings: string[];             // 과도한 해석 방지, 데이터 품질 경고
  artifacts: ToolArtifact[];
  code?: {                        // 실행된 Python 코드
    source: string;
    output: string;
  };
}

type DataProfile = {
  columns: ColumnProfile[];
  rowCount: number;
  missingRatio: number;
  duplicateRatio: number;
  qualityScore: number;
};
```

#### 사용 가능한 도구

| 도구 | 용도 |
|------|------|
| `file_read` | 데이터 파일 읽기 |
| `code_sandbox` | Python (pandas, numpy, matplotlib) 실행 |
| `data_analyze` | 구조화 데이터 프로파일링/분석 |
| `image_generate` | 차트/시각화 생성 |
| `file_write` | 분석 결과 파일 저장 |

#### 권한 수준

```
LEVEL: READ_WRITE (sandbox 내)
- 업로드된 파일 읽기
- sandbox 내 파일 생성/수정
- 외부 네트워크 접근 불가 (sandbox 격리)
- 분석 결과 artifact 생성
```

#### 모델 정책

| 플랜 | 모델 | sandbox 시간 |
|------|------|-------------|
| FREE | fast | 10초 |
| PRO | standard | 30초 |
| BUSINESS | standard | 60초 |
| ENTERPRISE | standard | 120초 |

#### 실패 처리

```
1. 파일 파싱 실패 → 인코딩 재시도 (UTF-8 → CP949 → Latin-1)
2. sandbox 타임아웃 → 쿼리 최적화 후 재실행
3. 데이터 품질 미달 → 경고 반환 + 가능한 범위 내 분석 수행
4. 시각화 실패 → 텍스트 기반 테이블 대체 출력
```

#### 다른 에이전트와의 연결

```
Governor → Data Agent (분석 요청)
Data Agent → Validator Agent (수치 검증)
Data Agent → UI Agent (차트/보고서 포맷팅)
Data Agent → Memory Agent (분석 결과 저장)
Knowledge Agent → Data Agent (검색 결과 정량 분석)
```

---

### 2.5 Automation Agent

**목적:** 외부 서비스(Gmail, Calendar, GitHub, Slack, Notion 등)와 연동하여 사용자 대신 작업을 수행한다. 항상 dry-run 우선, 멱등성 보장.

#### 입력 스키마

```typescript
interface AutomationInput {
  task: "execute" | "schedule" | "notify" | "chain";
  connector: ConnectorType;       // "gmail" | "calendar" | "github" | "slack" | "notion"
  action: string;                 // connector별 action
  parameters: Record<string, unknown>;
  dryRun: boolean;                // 기본 true
  chainSteps?: AutomationStep[];  // task chaining용
  requireApproval: boolean;       // human-in-the-loop
}
```

#### 출력 스키마

```typescript
interface AutomationOutput {
  status: "PREVIEW" | "EXECUTED" | "PENDING_APPROVAL" | "FAILED";
  preview?: ActionPreview;        // dry-run 결과
  result?: Record<string, unknown>;
  auditLog: AuditEntry;
  idempotencyKey: string;
  chainProgress?: {
    completed: number;
    total: number;
    currentStep: string;
  };
}
```

#### 사용 가능한 도구

| 도구 | 용도 |
|------|------|
| `api_call` | 외부 API 호출 |
| `email_send` | 이메일 발송 |
| `calendar_access` | 일정 조회/생성 |
| `browser_use` | 웹 자동화 |
| `shell_exec` | 시스템 명령 실행 |

#### 권한 수준

```
LEVEL: WRITE (승인 기반)
- dry-run은 항상 허용
- 실제 실행은 사용자 승인 후
- 파괴적 작업(delete, cancel)은 이중 확인
- API 키/토큰은 vault에서 안전하게 참조
```

#### 모델 정책

| 플랜 | 모델 | 근거 |
|------|------|------|
| 전 플랜 | fast | reasoning보다 tool orchestration이 핵심 |

> 복잡한 chain의 계획 수립은 Governor가 담당하므로, Automation Agent 자체는 경량 모델로 충분하다.

#### 실패 처리

```
1. API 인증 실패 → 사용자에게 재인증 요청
2. rate limit → TRANSIENT, 백오프 후 재시도
3. 중복 실행 감지 → idempotencyKey로 차단
4. chain 중간 실패 → 완료된 단계 보존, 실패 지점부터 재시작 옵션 제공
```

#### 다른 에이전트와의 연결

```
Governor → Automation Agent (자동화 작업 위임)
Automation Agent → Validator Agent (action 파라미터 검증)
Automation Agent → UI Agent (preview 표시)
Automation Agent → Memory Agent (audit trail 저장)
```

---

### 2.6 Multimodal Agent

**목적:** 이미지 이해, 문서 시각 요소 해석, 이미지 생성, OCR 등 시각적 입출력을 처리한다.

#### 입력 스키마

```typescript
interface MultimodalInput {
  task: "understand" | "generate" | "ocr" | "compare" | "describe";
  images?: ImageRef[];
  documents?: DocumentRef[];
  prompt: string;
  outputFormat?: "text" | "image" | "structured";
  style?: ImageStyle;            // 생성 시: "diagram" | "illustration" | "photo" | "ui"
}
```

#### 출력 스키마

```typescript
interface MultimodalOutput {
  description?: string;
  extractedText?: string;         // OCR 결과
  generatedImage?: ImageArtifact;
  structuredData?: Record<string, unknown>;  // 표/차트 데이터 추출
  comparison?: ComparisonResult;  // before/after
  confidence: number;
}
```

#### 사용 가능한 도구

| 도구 | 용도 |
|------|------|
| `image_understand` | 이미지 분석/OCR |
| `image_generate` | DALL-E/Stable Diffusion 이미지 생성 |
| `doc_read` | PDF 내 시각 요소 추출 |
| `file_read` | 이미지 파일 읽기 |

#### 권한 수준

```
LEVEL: READ + GENERATE
- 이미지/문서 읽기 허용
- 이미지 생성 허용 (content policy 내)
- 파일 시스템 쓰기 불가 (artifact로만 반환)
- NSFW/위험 콘텐츠 생성 차단
```

#### 모델 정책

| 플랜 | 이해 모델 | 생성 모델 |
|------|----------|----------|
| FREE | fast (vision) | DALL-E 3 (제한적) |
| PRO | standard (vision) | DALL-E 3 |
| BUSINESS+ | standard (vision) | DALL-E 3 + Stable Diffusion |

#### 실패 처리

```
1. 이미지 해석 불가 → 저해상도/손상 감지 시 사용자에게 재업로드 요청
2. 생성 content policy 위반 → 프롬프트 수정 제안
3. OCR 정확도 미달 → confidence 표시 + 수동 확인 권유
4. 대용량 이미지 → 리사이즈 후 처리
```

#### 다른 에이전트와의 연결

```
Governor → Multimodal Agent (시각 작업 위임)
Multimodal Agent → Knowledge Agent (이미지 내 텍스트로 추가 검색)
Multimodal Agent → Data Agent (차트 데이터 추출 → 분석)
Multimodal Agent → UI Agent (이미지 artifact 포맷팅)
Multimodal Agent → Designer Agent (디자인 분석/생성 협업)
```

---

### 2.7 Memory Agent

**목적:** 세션/프로젝트/사용자 수준의 메모리를 관리하고, 컨텍스트 압축, 메모리 검색/주입 정책을 결정한다.

#### 입력 스키마

```typescript
interface MemoryInput {
  operation: "store" | "retrieve" | "compact" | "search" | "delete";
  scope: MemoryScope;            // yua-shared SSOT: "user_profile" | "user_preference" | "user_research" | "project_architecture" | "project_decision" | "general_knowledge"
  content?: MemoryCandidate;
  query?: string;                // retrieve/search용
  compactConfig?: CompactConfig;
}

type MemoryCandidate = {
  text: string;
  importance: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  scope: MemoryScope;             // 저장 대상 scope (yua-shared SSOT)
  expiresAt?: string;              // TTL
};
```

#### 출력 스키마

```typescript
interface MemoryOutput {
  stored?: { id: string; scope: MemoryScope };
  retrieved?: MemoryEntry[];
  compacted?: CompactResult;
  searchResults?: MemorySearchResult[];
}

type CompactResult = {
  summary: string;
  pinnedFacts: string[];
  unresolvedItems: string[];
  droppedRanges: string[];
  compressionRatio: number;
  qualityScore: number;          // semantic drift 검증 점수
};
```

#### 사용 가능한 도구

| 도구 | 용도 |
|------|------|
| `vector_search` | 의미적 메모리 검색 |

> Memory Agent는 주로 DB 직접 접근으로 작동한다. 외부 도구 의존도가 낮다.

#### 권한 수준

```
LEVEL: MEMORY_ADMIN
- 메모리 읽기/쓰기/삭제
- 민감 정보 필터링 의무
- Governor 승인 없이 CRITICAL 메모리 삭제 불가
- 사용자 확인 없이 preference 메모리 저장 불가
```

#### 모델 정책

| 플랜 | 모델 | 근거 |
|------|------|------|
| 전 플랜 | fast | 메모리 관리는 요약/분류 위주로 경량 모델 충분 |

#### 실패 처리

```
1. 중복 메모리 감지 → dedup (cosine similarity > 0.92)
2. 모순 메모리 → contradiction detection 후 최신 우선 또는 사용자 확인
3. compact 후 semantic drift → drift score > 0.15 시 재압축
4. 저장 실패 → 트랜잭션 롤백 + 재시도
```

#### 다른 에이전트와의 연결

```
모든 Agent → Memory Agent (메모리 저장/조회)
Governor → Memory Agent (컨텍스트 압축 지시)
Memory Agent → Validator Agent (메모리 품질 검증)
```

#### 핵심 기능 상세

1. **Session Memory** — 현재 대화 핵심 상태, 장기 태스크 진행 상태 저장
2. **Project Memory** — 프로젝트 구조, 규칙, 중요 파일/결정/금지사항
3. **User Preference Memory** — 선호 톤, 작업 방식, 반복 요청 패턴
4. **Context Compaction** — L0~L5 계층 압축, 결정사항/금지사항/열린 이슈 구조적 보존
5. **Retrieval Policy** — 메모리 주입 시점/우선순위 결정, scope별 분리 주입
6. **Memory Safety** — 민감 정보 저장 제한, user-confirmed memory만 저장

#### 메모리 저장 구조

```
.yuan/
  memory/
    session/          # 현재 실행 중 요약, 최근 상태
    project/          # 프로젝트 구조, conventions, important facts
    user/             # 사용자 선호, 반복 패턴
    recovery/         # 실패 패턴, 자주 깨지는 지점
    artifacts/        # 생성된 계획, DAG, patch, reports
```

#### Compaction 계층 (L0~L5)

```
L0: system / policies / safety / immutable rules     — 절대 압축 불가
L1: active task state                                  — 원문 유지
L2: pinned project facts                               — 원문 유지
L3: recent conversation window (최근 N turn)            — 원문 유지
L4: summarized historical context                      — 요약 블록
L5: archived raw traces (external memory only)         — DB/파일로 이동
```

---

### 2.8 Validator Agent

**목적:** 에이전트 실행 결과를 구조적/의미적/사실적/안전성 관점에서 검증하고, 신뢰도 점수를 산출한다.

#### 입력 스키마

```typescript
interface ValidatorInput {
  validationType: "structural" | "semantic" | "factual" | "safety" | "full";
  agentOutput: unknown;
  originalRequest: string;
  taskContract: TaskContract;
  evidence?: EvidencePackage;     // Knowledge Agent에서 제공
}
```

#### 출력 스키마

```typescript
interface ValidatorOutput {
  passed: boolean;
  confidence: number;             // 0.0 ~ 1.0
  structural: StructuralResult;
  semantic: SemanticResult;
  factual?: FactualResult;
  safety: SafetyResult;
  issues: ValidationIssue[];
  recommendation: "APPROVE" | "REFINE" | "REJECT" | "ESCALATE";
}

type StructuralResult = {
  formatValid: boolean;
  schemaValid: boolean;
  filesExist: boolean;
  commandsSucceeded: boolean;
  testssPassed: boolean;
};

type SemanticResult = {
  intentFulfilled: boolean;
  requirementsCovered: string[];
  requirementsMissed: string[];
  logicConsistent: boolean;
  regressionRisk: "LOW" | "MEDIUM" | "HIGH";
};
```

#### 사용 가능한 도구

| 도구 | 용도 |
|------|------|
| `web_search` | 사실 검증용 추가 검색 |
| `shell_exec` | 테스트/빌드 실행 |
| `file_read` | 생성된 파일 확인 |
| `code_sandbox` | 코드 실행 검증 |

#### 권한 수준

```
LEVEL: READ_ONLY + EXECUTE (검증 목적)
- 파일 읽기 허용
- 테스트/빌드 실행 허용
- 파일 수정 불가
- 검증 결과만 반환
```

#### 모델 정책

| 플랜 | 모델 | 검증 깊이 |
|------|------|----------|
| FREE | fast | structural만 |
| PRO | standard | structural + semantic |
| BUSINESS | standard | full (structural + semantic + factual) |
| ENTERPRISE | premium | full + safety 강화 |

#### 실패 처리

```
1. 검증 자체 실패 → Governor에 검증 불가 보고, 사용자에게 미검증 표시
2. 낮은 confidence → 추가 검증 라운드 또는 사용자 확인 요청
3. safety 위반 → 즉시 REJECT, Governor에 escalate
```

#### 다른 에이전트와의 연결

```
모든 Specialized Agent → Validator Agent (결과 검증)
Validator Agent → Governor (검증 결과 보고)
Validator Agent → Recovery Agent (REJECT 시 실패 보고)
Validator Agent → Knowledge Agent (사실 검증 추가 검색)
```

---

### 2.9 Recovery Agent

**목적:** 실패 원인을 분류하고, 유형에 맞는 복구 전략을 실행한다. 무조건 patch 생성이 아닌, 원인별 맞춤 복구.

#### 입력 스키마

```typescript
interface RecoveryInput {
  failureReport: FailureReport;
  originalTask: TaskContract;
  agentOutput: unknown;
  retryCount: number;
  maxRetries: number;
}

type FailureReport = {
  failureType: FailureType;
  errorMessage: string;
  stderr?: string;
  stdout?: string;
  validatorResult?: ValidatorOutput;
  patchHistory?: Patch[];
  timestamp: string;
};
```

#### 출력 스키마

```typescript
interface RecoveryOutput {
  action: RecoveryAction;
  modifiedTask?: TaskContract;    // 재계획 시
  patch?: Patch[];                // 코드 수정 시
  contextSupplement?: string;     // CONTEXT_LOSS 보강 시
  rootCauseSnapshot: RootCauseSnapshot;
  budgetConsumed: BudgetUsage;
}

type RecoveryAction =
  | "RETRY"                       // TRANSIENT → 재시도
  | "FIX_PARAMS"                  // TOOL_MISUSE → 파라미터 수정
  | "PATCH_CODE"                  // LOGIC_ERROR → 코드 패치
  | "SUPPLEMENT_CONTEXT"          // CONTEXT_LOSS → 맥락 보강
  | "REPLAN"                      // SPEC_MISMATCH → Governor 재계획
  | "REFINE"                      // VALIDATION_FAIL → 품질 개선
  | "ABORT"                       // 복구 불가 → 사용자 보고
  | "ESCALATE";                   // 인간 개입 필요
```

#### FailureType 분류 체계

```typescript
type FailureType =
  | "TRANSIENT"          // 일시적 API 실패, 타임아웃, rate limit
  | "TOOL_MISUSE"        // 잘못된 명령, 잘못된 파라미터
  | "LOGIC_ERROR"        // 코드/추론 자체 오류
  | "CONTEXT_LOSS"       // 필요한 맥락 누락
  | "SPEC_MISMATCH"      // 요구사항 오해
  | "VALIDATION_FAIL"    // 테스트/품질 기준 미달
  | "CONFLICT_FAIL";     // 에이전트 간 결과 충돌
```

#### Recovery Policy 매핑

| FailureType | 1차 대응 | 2차 대응 | max retries |
|-------------|---------|---------|-------------|
| TRANSIENT | RETRY (backoff) | ABORT | 3 |
| TOOL_MISUSE | FIX_PARAMS | ESCALATE | 2 |
| LOGIC_ERROR | PATCH_CODE | REPLAN | 3 |
| CONTEXT_LOSS | SUPPLEMENT_CONTEXT | REPLAN | 2 |
| SPEC_MISMATCH | REPLAN | ESCALATE | 1 |
| VALIDATION_FAIL | REFINE | PATCH_CODE | 3 |
| CONFLICT_FAIL | Governor 중재 | ESCALATE | 1 |

#### 사용 가능한 도구

| 도구 | 용도 |
|------|------|
| `file_read` | 실패 맥락 파일 읽기 |
| `shell_exec` | 재시도 명령 실행 |
| `vector_search` | 과거 유사 실패 패턴 조회 |

#### 권한 수준

```
LEVEL: READ + LIMITED_WRITE
- 실패 분석용 파일 읽기
- 수정 패치 생성 (Coding Agent에 위임)
- 직접 파일 수정 불가 (항상 위임)
```

#### 모델 정책

| 플랜 | 모델 |
|------|------|
| 전 플랜 | standard |

> 실패 분석은 높은 reasoning 능력이 필요하므로 경량 모델 부적합.

#### 실패 처리

```
1. 복구 자체 실패 → ABORT + 사용자에게 전체 실패 보고서 제공
2. retry 예산 소진 → ESCALATE + root cause snapshot 저장
3. 반복 실패 패턴 → recovery memory에 축적하여 향후 예방
```

#### 다른 에이전트와의 연결

```
Validator Agent → Recovery Agent (REJECT 시 실패 보고)
Recovery Agent → Governor (REPLAN/ESCALATE 시)
Recovery Agent → Coding Agent (PATCH_CODE 시)
Recovery Agent → Memory Agent (recovery memory 저장)
Recovery Agent → Knowledge Agent (CONTEXT_LOSS 보강)
```

---

### 2.10 UI/Interaction Agent

**목적:** 에이전트 실행 결과를 사용자에게 최적화된 형태로 포맷팅하고 전달한다. 응답 모드, 청중 적응, 시각적 패키징을 담당.

#### 입력 스키마

```typescript
interface UIAgentInput {
  rawResults: AgentResult[];
  responseMode?: "brief" | "detailed" | "report" | "tutorial" | "checklist";
  audience?: "developer" | "non_technical" | "executive" | "customer";
  format?: "markdown" | "html" | "slides" | "email";
  includeTrace?: boolean;
  followUpEnabled: boolean;
}
```

#### 출력 스키마

```typescript
interface UIAgentOutput {
  content: string;                // 최종 포맷팅된 응답
  artifacts: ToolArtifact[];      // 이미지, 표, 코드블록
  suggestions: SuggestionItem[];  // follow-up 제안
  metadata: {
    responseMode: string;
    audience: string;
    wordCount: number;
    readingTime: number;
  };
}
```

#### 사용 가능한 도구

없음. UI Agent는 도구를 호출하지 않고 텍스트 변환만 수행한다.

#### 권한 수준

```
LEVEL: NONE (출력 전용)
- 도구 호출 불가
- 파일 접근 불가
- 오직 입력된 결과를 변환하여 출력
```

#### 모델 정책

| 플랜 | 모델 |
|------|------|
| 전 플랜 | fast |

> 포맷팅/요약은 경량 모델로 충분하다. 핵심 결과는 이미 다른 에이전트가 산출했으므로.

#### 실패 처리

```
1. 포맷팅 실패 → raw 결과를 그대로 전달
2. artifact 누락 → 텍스트 대체 설명 삽입
```

#### 다른 에이전트와의 연결

```
Governor → UI Agent (최종 응답 지시)
모든 Agent → UI Agent (artifact 전달)
```

#### 핵심 기능 상세

1. **Response Mode Selection** — 짧은 답변/상세 설명/보고서형/튜토리얼형/체크리스트형
2. **Artifact Formatting** — 문서, 표, 코드블록, 슬라이드용 요약, 이메일 초안
3. **Audience Adaptation** — 비개발자용/개발자용/임원 보고용/고객 공유용
4. **Visual Packaging** — 제목/섹션 구조화, 읽기 쉬운 단계 정리, 핵심 요약 강조
5. **Follow-up Hint Generation** — 다음 액션 제안, 리스크/주의점 표시

---

### 2.11 Designer Agent

**목적:** UI/UX 레이아웃 계획, 비주얼 계층 구조 설계, 컴포넌트 선택, 디자인 시스템 준수를 보조한다.

#### 입력 스키마

```typescript
interface DesignerInput {
  task: "layout" | "review" | "suggest" | "component" | "responsive" | "theme";
  description: string;
  currentDesign?: {
    screenshots?: ImageRef[];
    code?: CodeSnippet[];         // JSX/CSS
    designSystem?: string;        // "tailwind" | "material" | "custom"
  };
  constraints?: {
    platform: "web" | "mobile" | "desktop";
    breakpoints?: string[];
    accessibility?: boolean;
    darkMode?: boolean;
  };
}
```

#### 출력 스키마

```typescript
interface DesignerOutput {
  layout?: LayoutPlan;
  components?: ComponentSuggestion[];
  review?: DesignReview;
  code?: CodeSnippet[];           // JSX/Tailwind 코드
  mockup?: ImageArtifact;         // 생성된 목업 이미지
  designTokens?: Record<string, string>;
}

type LayoutPlan = {
  structure: string;              // ASCII wireframe 또는 설명
  hierarchy: string[];            // 비주얼 우선순위
  spacing: Record<string, string>;
  responsiveNotes: string[];
};

type DesignReview = {
  score: number;
  issues: DesignIssue[];
  improvements: string[];
  accessibilityNotes: string[];
};
```

#### 사용 가능한 도구

| 도구 | 용도 |
|------|------|
| `image_understand` | 스크린샷 분석 |
| `image_generate` | 목업/와이어프레임 생성 |
| `file_read` | 기존 CSS/JSX 코드 읽기 |
| `web_search` | 디자인 레퍼런스 검색 |
| `browser_use` | 경쟁사/레퍼런스 사이트 탐색 |

#### 권한 수준

```
LEVEL: READ + GENERATE
- 파일 읽기 허용
- 이미지 생성 허용
- 코드 생성은 제안(suggestion)으로만 반환
- 직접 파일 수정 불가 (Coding Agent에 위임)
```

#### 모델 정책

| 플랜 | 모델 |
|------|------|
| FREE | fast |
| PRO+ | standard (vision) |

#### 실패 처리

```
1. 디자인 시스템 미지정 → Tailwind 기본값 적용
2. 스크린샷 해석 불가 → 텍스트 기반 설명 요청
3. 접근성 미달 → 자동 수정 제안 추가
```

#### 다른 에이전트와의 연결

```
Governor → Designer Agent (디자인 작업 위임)
Designer Agent → Multimodal Agent (이미지 분석/생성)
Designer Agent → Coding Agent (코드 구현 위임)
Designer Agent → Validator Agent (디자인 품질 검증)
```

---

## 3. 도구(Tool) 명세

### 공통 타입

```typescript
// ⚠️ SSOT: yua-shared/src/task/task-node.types.ts 참조
type SideEffectLevel = "none" | "read" | "write" | "shell" | "network" | "deploy";

// ⚠️ AuthenticationLevel: 접근 주체의 인증 수준
// Core 문서의 PermissionLevel("read_only"|"write"|"shell"|"network"|"deploy")과 구분됨
type AuthenticationLevel = "PUBLIC" | "AUTHENTICATED" | "ELEVATED" | "ADMIN";

type ToolResult<T = unknown> = {
  status: "OK" | "PARTIAL" | "ERROR";
  output?: T;
  provenance: {
    inputsHash: string;
    toolVersion: string;
    startedAt: number;
    endedAt: number;
    sources?: { kind: string; ref: string }[];
    cache?: { hit: boolean; key: string };
  };
  metrics?: Record<string, number>;
  warnings?: string[];
  error?: { code: string; message: string; retryable?: boolean };
};
```

---

### 3.1 web_search

**설명:** 웹 검색 엔진을 통해 정보를 검색한다. 쿼리 자동 재작성, 다국어 확장을 지원한다.

#### 입력 파라미터

```typescript
interface WebSearchParams {
  query: string;                  // 검색 쿼리
  rewrite?: boolean;              // 쿼리 자동 재작성 (기본: true)
  language?: string;              // 검색 언어 (기본: auto-detect)
  region?: string;                // 지역 필터
  freshness?: "day" | "week" | "month" | "year" | "any";
  maxResults?: number;            // 기본: 10, 최대: 50
  excludeDomains?: string[];      // 제외할 도메인
  safeSearch?: boolean;           // 기본: true
}
```

#### 출력 스키마

```typescript
interface WebSearchResult {
  results: {
    title: string;
    url: string;
    snippet: string;
    publishedAt?: string;
    domain: string;
    relevanceScore: number;
  }[];
  rewrittenQuery?: string;        // 재작성된 쿼리
  totalEstimate: number;
}
```

| 속성 | 값 |
|------|-----|
| Side Effect Level | NONE |
| Permission | AUTHENTICATED |
| Rate Limit | FREE: 10/시간, PRO: 100/시간, BUSINESS: 500/시간, ENTERPRISE: 2000/시간 |

---

### 3.2 file_read

**설명:** 로컬 파일 시스템에서 파일 내용을 읽는다. 텍스트, 이미지, 바이너리 파일 지원.

#### 입력 파라미터

```typescript
interface FileReadParams {
  path: string;                   // 절대 경로
  encoding?: string;              // 기본: "utf-8"
  offset?: number;                // 시작 줄 번호
  limit?: number;                 // 읽을 줄 수
  maxSize?: number;               // 최대 바이트 (기본: 1MB)
}
```

#### 출력 스키마

```typescript
interface FileReadResult {
  content: string;
  path: string;
  size: number;                   // bytes
  lines: number;
  encoding: string;
  mimeType: string;
  truncated: boolean;
}
```

| 속성 | 값 |
|------|-----|
| Side Effect Level | READ |
| Permission | AUTHENTICATED |
| Rate Limit | 없음 (로컬 파일) |

---

### 3.3 file_write

**설명:** 새 파일을 생성하거나 기존 파일을 완전히 덮어쓴다. 기존 파일 수정은 `file_edit` 사용을 권장한다.

#### 입력 파라미터

```typescript
interface FileWriteParams {
  path: string;                   // 절대 경로
  content: string;                // 파일 내용
  encoding?: string;              // 기본: "utf-8"
  createDirs?: boolean;           // 상위 디렉토리 자동 생성 (기본: true)
  overwrite?: boolean;            // 기존 파일 덮어쓰기 (기본: false)
}
```

#### 출력 스키마

```typescript
interface FileWriteResult {
  path: string;
  bytesWritten: number;
  created: boolean;               // 새로 생성 vs 덮어쓰기
}
```

| 속성 | 값 |
|------|-----|
| Side Effect Level | WRITE |
| Permission | ELEVATED |
| Rate Limit | 100/요청 (무한 파일 생성 방지) |

---

### 3.4 file_edit

**설명:** 기존 파일을 unified diff 기반으로 부분 수정한다. 전체 덮어쓰기 대신 최소 변경을 적용한다.

#### 입력 파라미터

```typescript
interface FileEditParams {
  path: string;                   // 절대 경로
  edits: {
    oldText: string;              // 기존 텍스트 (정확 매칭)
    newText: string;              // 대체 텍스트
  }[];
  dryRun?: boolean;               // 변경 미리보기만 (기본: false)
}
```

#### 출력 스키마

```typescript
interface FileEditResult {
  path: string;
  applied: number;                // 적용된 edit 수
  failed: number;                 // 실패한 edit 수
  diff: string;                   // unified diff
  preview?: string;               // dryRun=true 시 변경 후 전체 내용
}
```

| 속성 | 값 |
|------|-----|
| Side Effect Level | WRITE |
| Permission | ELEVATED |
| Rate Limit | 200/요청 |

---

### 3.5 shell_exec

**설명:** 쉘 명령을 실행한다. allowlist 기반으로 위험 명령을 차단한다.

#### 입력 파라미터

```typescript
interface ShellExecParams {
  command: string;                // 실행할 명령
  cwd?: string;                   // 작업 디렉토리
  timeout?: number;               // ms (기본: 30000, 최대: 300000)
  env?: Record<string, string>;   // 추가 환경 변수
}
```

#### 출력 스키마

```typescript
interface ShellExecResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  durationMs: number;
}
```

#### 차단 명령 (Blocklist)

```
rm -rf /
drop database
format
mkfs
dd if=
shutdown
reboot
kill -9 1
> /dev/sda
chmod 777 /
```

| 속성 | 값 |
|------|-----|
| Side Effect Level | WRITE |
| Permission | ELEVATED |
| Rate Limit | 50/요청, 10/분 |

---

### 3.6 code_sandbox

**설명:** 격리된 Python 환경에서 코드를 실행한다. pandas, numpy, matplotlib 등 데이터 분석 라이브러리 내장.

#### 입력 파라미터

```typescript
interface CodeSandboxParams {
  language: "python";             // 현재 Python만 지원
  code: string;                   // 실행할 코드
  files?: {                       // 샌드박스에 주입할 파일
    name: string;
    content: string;
  }[];
  timeout?: number;               // ms (기본: 30000)
  memoryLimit?: number;           // MB (기본: 512)
}
```

#### 출력 스키마

```typescript
interface CodeSandboxResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  files?: {                       // 생성된 파일 (이미지 등)
    name: string;
    mimeType: string;
    url: string;                  // artifact URL
    size: number;
  }[];
  durationMs: number;
  memoryUsedMB: number;
}
```

| 속성 | 값 |
|------|-----|
| Side Effect Level | NONE (격리된 환경) |
| Permission | AUTHENTICATED |
| Rate Limit | FREE: 5/시간, PRO: 50/시간, BUSINESS: 200/시간, ENTERPRISE: 무제한 |

---

### 3.7 image_understand

**설명:** 이미지를 분석하여 객체, 텍스트(OCR), 레이아웃, 감정 등을 파악한다.

#### 입력 파라미터

```typescript
interface ImageUnderstandParams {
  imageUrl: string;               // 이미지 URL 또는 base64 data URI
  tasks: ("describe" | "ocr" | "objects" | "layout" | "chart_data")[];
  language?: string;              // 응답 언어
  detail?: "low" | "high";       // 분석 세밀도
}
```

#### 출력 스키마

```typescript
interface ImageUnderstandResult {
  description?: string;
  ocrText?: string;
  objects?: { label: string; bbox: number[]; confidence: number }[];
  layout?: { regions: LayoutRegion[] };
  chartData?: { type: string; data: Record<string, unknown>[] };
  dimensions: { width: number; height: number };
}
```

| 속성 | 값 |
|------|-----|
| Side Effect Level | NONE |
| Permission | AUTHENTICATED |
| Rate Limit | FREE: 10/시간, PRO: 100/시간, BUSINESS+: 500/시간 |

---

### 3.8 image_generate

**설명:** 텍스트 프롬프트로 이미지를 생성한다. DALL-E 3 또는 Stable Diffusion 백엔드.

#### 입력 파라미터

```typescript
interface ImageGenerateParams {
  prompt: string;                 // 생성 프롬프트
  negativePrompt?: string;        // 제외할 요소
  size?: "256x256" | "512x512" | "1024x1024" | "1792x1024" | "1024x1792";
  style?: "natural" | "vivid";
  quality?: "standard" | "hd";
  backend?: "dall-e-3" | "stable-diffusion";
  count?: number;                 // 생성 수 (1~4)
}
```

#### 출력 스키마

```typescript
interface ImageGenerateResult {
  images: {
    url: string;
    revisedPrompt: string;        // 모델이 수정한 프롬프트
    size: string;
  }[];
}
```

| 속성 | 값 |
|------|-----|
| Side Effect Level | NONE |
| Permission | AUTHENTICATED |
| Rate Limit | FREE: 3/일, PRO: 50/일, BUSINESS: 200/일, ENTERPRISE: 1000/일 |

---

### 3.9 data_analyze

**설명:** 구조화된 데이터(CSV, JSON, 테이블)를 프로파일링하고 기본 통계/이상치를 분석한다.

#### 입력 파라미터

```typescript
interface DataAnalyzeParams {
  data: {
    source: "file" | "inline";
    filePath?: string;
    inlineData?: Record<string, unknown>[];
  };
  goals?: ("schema" | "stats" | "outliers" | "trend" | "correlation")[];
  sampleSize?: number;            // 프로파일링용 샘플 크기
}
```

#### 출력 스키마

```typescript
interface DataAnalyzeResult {
  schema: {
    columns: { name: string; type: string; nullable: boolean }[];
    rowCount: number;
  };
  stats?: {
    column: string;
    mean?: number;
    median?: number;
    std?: number;
    min?: number;
    max?: number;
    uniqueCount: number;
    nullCount: number;
  }[];
  outliers?: { column: string; indices: number[]; method: string }[];
  trend?: { column: string; direction: "up" | "down" | "flat"; slope: number }[];
  sampleRows: Record<string, unknown>[];
}
```

| 속성 | 값 |
|------|-----|
| Side Effect Level | READ |
| Permission | AUTHENTICATED |
| Rate Limit | 100/시간 |

---

### 3.10 doc_read

**설명:** PDF, DOCX, PPTX 등 문서 파일을 읽어 텍스트와 구조를 추출한다.

#### 입력 파라미터

```typescript
interface DocReadParams {
  path: string;                   // 파일 경로 또는 URL
  pages?: string;                 // 페이지 범위 (예: "1-5", "3,7,10-15")
  extractImages?: boolean;        // 이미지 추출 여부
  extractTables?: boolean;        // 표 추출 여부
}
```

#### 출력 스키마

```typescript
interface DocReadResult {
  text: string;
  pages: number;
  metadata: {
    title?: string;
    author?: string;
    createdAt?: string;
    format: string;
  };
  tables?: { page: number; headers: string[]; rows: string[][] }[];
  images?: { page: number; url: string; caption?: string }[];
}
```

| 속성 | 값 |
|------|-----|
| Side Effect Level | READ |
| Permission | AUTHENTICATED |
| Rate Limit | 50/시간 |

---

### 3.11 vector_search

**설명:** pgvector 기반 지식베이스에서 의미적 유사도 검색을 수행한다.

#### 입력 파라미터

```typescript
interface VectorSearchParams {
  query: string;                  // 검색 쿼리
  collection: string;             // "memory" | "knowledge" | "documents" | "code"
  topK?: number;                  // 기본: 5, 최대: 50
  threshold?: number;             // 최소 유사도 (기본: 0.7)
  filters?: {
    scope?: MemoryScope;
    userId?: number;
    workspaceId?: string;
    dateRange?: { from: string; to: string };
  };
}
```

#### 출력 스키마

```typescript
interface VectorSearchResult {
  matches: {
    id: string;
    content: string;
    score: number;                // cosine similarity
    metadata: Record<string, unknown>;
    scope: string;
  }[];
  queryEmbeddingMs: number;
  searchMs: number;
}
```

| 속성 | 값 |
|------|-----|
| Side Effect Level | READ |
| Permission | AUTHENTICATED |
| Rate Limit | 200/시간 |

---

### 3.12 api_call

**설명:** 외부 REST API를 호출한다. 인증 정보는 vault에서 안전하게 참조.

#### 입력 파라미터

```typescript
interface ApiCallParams {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
  auth?: {
    type: "bearer" | "basic" | "api_key";
    credentialId: string;         // vault에서 참조할 ID
  };
  timeout?: number;               // ms (기본: 10000)
  followRedirects?: boolean;
}
```

#### 출력 스키마

```typescript
interface ApiCallResult {
  statusCode: number;
  headers: Record<string, string>;
  body: unknown;
  durationMs: number;
  redirectChain?: string[];
}
```

| 속성 | 값 |
|------|-----|
| Side Effect Level | WRITE (method에 따라 READ~DESTRUCTIVE) |
| Permission | ELEVATED |
| Rate Limit | 30/분 |

---

### 3.13 git_ops

**설명:** Git 작업(status, diff, commit, branch, log)을 수행한다. push는 사용자 승인 필요.

#### 입력 파라미터

```typescript
interface GitOpsParams {
  operation: "status" | "diff" | "log" | "commit" | "branch" | "checkout" | "stash";
  cwd: string;                    // 저장소 경로
  args?: {
    // commit용
    message?: string;
    files?: string[];
    // diff용
    base?: string;
    head?: string;
    // branch용
    name?: string;
    // log용
    count?: number;
    // checkout용
    target?: string;
  };
}
```

#### 출력 스키마

```typescript
interface GitOpsResult {
  operation: string;
  output: string;
  success: boolean;
  // commit용
  commitHash?: string;
  // status용
  staged?: string[];
  modified?: string[];
  untracked?: string[];
  // log용
  commits?: { hash: string; message: string; author: string; date: string }[];
}
```

| 속성 | 값 |
|------|-----|
| Side Effect Level | status/diff/log: READ, commit/branch: WRITE, force push: DESTRUCTIVE |
| Permission | ELEVATED |
| Rate Limit | 100/시간 |

> **제한사항:** `push`, `reset --hard`, `clean -f`, `rebase` 등 파괴적 작업은 사용자 명시적 승인 필요.

---

### 3.14 browser_use

**설명:** 웹 브라우저를 자동화하여 페이지 탐색, 스크린샷, 데이터 추출을 수행한다.

#### 입력 파라미터

```typescript
interface BrowserUseParams {
  action: "navigate" | "screenshot" | "extract" | "click" | "fill" | "scroll";
  url?: string;                   // navigate 시
  selector?: string;              // CSS selector (click, fill, extract)
  value?: string;                 // fill 시 입력값
  waitFor?: string;               // selector 또는 "networkidle"
  timeout?: number;               // ms (기본: 15000)
}
```

#### 출력 스키마

```typescript
interface BrowserUseResult {
  pageTitle: string;
  currentUrl: string;
  screenshot?: string;            // base64 PNG
  extractedText?: string;
  extractedData?: Record<string, unknown>[];
  success: boolean;
}
```

| 속성 | 값 |
|------|-----|
| Side Effect Level | READ (navigate/extract), WRITE (click/fill) |
| Permission | ELEVATED |
| Rate Limit | 30/시간 |

---

### 3.15 calendar_access

**설명:** Google Calendar 등 일정 서비스에 접근하여 일정을 조회하거나 생성한다.

#### 입력 파라미터

```typescript
interface CalendarAccessParams {
  operation: "list" | "create" | "update" | "delete";
  calendarId?: string;            // 기본: primary
  timeRange?: { start: string; end: string };  // list용
  event?: {
    title: string;
    start: string;                // ISO 8601
    end: string;
    description?: string;
    attendees?: string[];
    location?: string;
  };
  eventId?: string;               // update/delete용
}
```

#### 출력 스키마

```typescript
interface CalendarAccessResult {
  events?: {
    id: string;
    title: string;
    start: string;
    end: string;
    attendees?: string[];
    location?: string;
  }[];
  created?: { id: string; htmlLink: string };
  updated?: boolean;
  deleted?: boolean;
}
```

| 속성 | 값 |
|------|-----|
| Side Effect Level | list: READ, create/update: WRITE, delete: DESTRUCTIVE |
| Permission | ELEVATED |
| Rate Limit | 50/시간 |

---

### 3.16 email_send

**설명:** 이메일을 작성하여 발송한다. 항상 preview 단계를 거친다.

#### 입력 파라미터

```typescript
interface EmailSendParams {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;                   // HTML 또는 plain text
  bodyFormat: "html" | "plain";
  attachments?: { name: string; url: string; mimeType: string }[];
  preview: boolean;               // 기본: true (발송 전 미리보기)
  replyTo?: string;               // 답장 시 원본 메시지 ID
}
```

#### 출력 스키마

```typescript
interface EmailSendResult {
  status: "PREVIEWED" | "SENT" | "FAILED";
  preview?: {
    renderedHtml: string;
    recipients: string[];
    subject: string;
  };
  messageId?: string;
  sentAt?: string;
}
```

| 속성 | 값 |
|------|-----|
| Side Effect Level | WRITE |
| Permission | ELEVATED + 사용자 승인 |
| Rate Limit | 20/시간 |

---

## 4. 슬래시 명령 시스템

사용자가 `/` 입력 시 표시되는 명령 팔레트. 각 명령은 해당 에이전트에 직접 라우팅된다.

### 4.1 /agent — 에이전트 관리

| 명령 | 설명 | 라우팅 |
|------|------|--------|
| `/agent list` | 현재 활성 에이전트 목록 표시 | Governor |
| `/agent spawn <type>` | 특정 에이전트 수동 생성 | Governor |
| `/agent stop <id>` | 실행 중인 에이전트 중단 | Governor |
| `/agent status` | 전체 에이전트 상태 대시보드 | Governor |
| `/agent logs <id>` | 특정 에이전트 실행 로그 | Governor |
| `/agent graph` | 현재 실행 DAG 시각화 | Governor → UI Agent |

#### 출력 예시 (/agent status)

```
 AGENT              STATUS    TOKENS   DURATION
 Governor           ACTIVE    1,204    2.1s
 Knowledge Agent    DONE      3,841    4.3s
 Coding Agent       RUNNING   2,105    6.7s
 Validator Agent    PENDING   -        -
```

---

### 4.2 /code — 코딩 작업

| 명령 | 설명 | 라우팅 |
|------|------|--------|
| `/code review [file]` | 코드 리뷰 수행 | Coding Agent |
| `/code fix [description]` | 버그 수정 | Coding Agent |
| `/code explain [file:line]` | 코드 설명 | Coding Agent |
| `/code refactor [file]` | 리팩토링 제안 | Coding Agent |
| `/code test [file]` | 테스트 생성 | Coding Agent |
| `/code diff` | 현재 변경사항 diff 표시 | Coding Agent → git_ops |
| `/code plan [description]` | 구현 계획 수립 | Coding Agent |

#### 사용 예시

```
/code review src/ai/execution/execution-engine.ts
/code fix "ChatInput에서 한국어 IME 조합 중 버퍼 초기화 문제"
/code test src/service/workflow-service.ts
```

---

### 4.3 /project — 프로젝트 관리

| 명령 | 설명 | 라우팅 |
|------|------|--------|
| `/project info` | 프로젝트 구조/스택/의존성 요약 | Coding Agent + Memory Agent |
| `/project scan` | 코드베이스 전체 스캔 (구조, 이슈, 기술 부채) | Coding Agent + Validator Agent |
| `/project cleanup` | dead code, 미사용 import, 중복 제거 제안 | Coding Agent |

---

### 4.4 /memory — 메모리 관리

| 명령 | 설명 | 라우팅 |
|------|------|--------|
| `/memory list [scope]` | 저장된 메모리 목록 | Memory Agent |
| `/memory add <text>` | 메모리 수동 추가 | Memory Agent |
| `/memory clear [scope]` | 메모리 삭제 (확인 필요) | Memory Agent |
| `/memory search <query>` | 메모리 의미 검색 | Memory Agent → vector_search |

#### 사용 예시

```
/memory list project
/memory add "이 프로젝트에서는 Tailwind만 사용, styled-components 금지"
/memory search "인증 흐름"
```

---

### 4.5 /context — 컨텍스트 관리

| 명령 | 설명 | 라우팅 |
|------|------|--------|
| `/context compact` | 현재 대화 컨텍스트 압축 | Memory Agent |
| `/context status` | 토큰 사용량, 압축 상태 표시 | Governor |
| `/context inject <file>` | 파일/URL을 컨텍스트에 추가 | Governor → file_read |

#### 출력 예시 (/context status)

```
 CONTEXT STATUS
 Total tokens:     42,150 / 128,000
 System prompt:     3,200 (보존됨)
 Active task:       8,400 (보존됨)
 Recent turns:     18,550 (최근 12 turn)
 Summarized:       12,000 (요약 4개 블록)
 Compaction:       BALANCED mode
 Next compact at:  ~65,000 tokens
```

---

### 4.6 /tools — 도구 관리

| 명령 | 설명 | 라우팅 |
|------|------|--------|
| `/tools list` | 사용 가능한 도구 목록 + 상태 | Governor |
| `/tools enable <name>` | 특정 도구 활성화 | Governor |
| `/tools disable <name>` | 특정 도구 비활성화 | Governor |

#### 출력 예시 (/tools list)

```
 TOOL              STATUS    SIDE_EFFECT   CALLS_LEFT
 web_search        ENABLED   NONE          88/100
 file_read         ENABLED   READ          unlimited
 file_write        ENABLED   WRITE         100
 file_edit         ENABLED   WRITE         200
 shell_exec        ENABLED   WRITE         45/50
 code_sandbox      ENABLED   NONE          48/50
 image_generate    DISABLED  NONE          3/3
 email_send        ENABLED   WRITE         20/20
```

---

### 4.7 /system — 시스템 설정

| 명령 | 설명 | 라우팅 |
|------|------|--------|
| `/system config` | 현재 시스템 설정 표시 | Governor |
| `/system budget` | 토큰/비용 예산 현황 | Governor |
| `/system stats` | 세션 통계 (호출 수, 성공률, 평균 지연) | Governor |

#### 출력 예시 (/system stats)

```
 SESSION STATS
 Duration:          14m 32s
 Total requests:    8
 Agent calls:       23
 Tool calls:        47
 Success rate:      91.5%
 Avg latency:       3.2s
 Tokens used:       42,150
 Estimated cost:    $0.18
```

---

### 4.8 /search — 검색

| 명령 | 설명 | 라우팅 |
|------|------|--------|
| `/search web <query>` | 웹 검색 | Knowledge Agent → web_search |
| `/search docs <query>` | 내부 문서 검색 | Knowledge Agent → vector_search |
| `/search code <query>` | 코드베이스 검색 | Coding Agent → file_read + grep |

---

### 4.9 /design — 디자인

| 명령 | 설명 | 라우팅 |
|------|------|--------|
| `/design layout <description>` | 레이아웃 계획 생성 | Designer Agent |
| `/design review [file\|screenshot]` | 디자인 리뷰 | Designer Agent + Multimodal Agent |
| `/design suggest <description>` | 디자인 개선 제안 | Designer Agent |

#### 사용 예시

```
/design layout "대시보드 메인 페이지 - 왼쪽 사이드바, 상단 헤더, 카드 그리드"
/design review /screenshots/current-ui.png
/design suggest "모바일 반응형 개선"
```

---

## 5. 공통 계약 및 타입

### 5.1 AgentId

```typescript
type AgentId =
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
```

### 5.2 ToolName

```typescript
type ToolName =
  | "web_search"
  | "file_read"
  | "file_write"
  | "file_edit"
  | "shell_exec"
  | "code_sandbox"
  | "image_understand"
  | "image_generate"
  | "data_analyze"
  | "doc_read"
  | "vector_search"
  | "api_call"
  | "git_ops"
  | "browser_use"
  | "calendar_access"
  | "email_send";
```

### 5.3 SideEffectLevel

```typescript
// ⚠️ SSOT: yua-shared/src/task/task-node.types.ts 참조
type SideEffectLevel = "none" | "read" | "write" | "shell" | "network" | "deploy";
```

**이전 값 매핑:**
```
매핑: NONE→none, READ→read, WRITE→write, DESTRUCTIVE→deploy
추가: shell (셸 명령), network (외부 네트워크)
```

### 5.4 BudgetLimit

```typescript
interface BudgetLimit {
  maxTokens: number;
  maxLatencyMs: number;
  maxToolCalls: number;
  maxCostUnits: number;
  maxRetries: number;
}
```

### 5.5 RetryPolicy

```typescript
interface RetryPolicy {
  maxRetries: number;
  backoffMs: number;              // 초기 대기 시간
  backoffMultiplier: number;      // 지수 증가 배수
  retryableErrors: FailureType[];
}
```

### 5.6 에이전트-도구 접근 매트릭스

| 에이전트 | web_search | file_read | file_write | file_edit | shell_exec | code_sandbox | image_understand | image_generate | data_analyze | doc_read | vector_search | api_call | git_ops | browser_use | calendar_access | email_send |
|---------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Governor | - | - | - | - | - | - | - | - | - | - | O | - | - | - | - | - |
| Knowledge | O | O | - | - | - | - | - | - | - | O | O | - | - | O | - | - |
| Coding | O | O | O | O | O | O | - | - | - | - | - | - | O | - | - | - |
| Data | - | O | O | - | - | O | - | O | O | - | - | - | - | - | - | - |
| Automation | - | - | - | - | O | - | - | - | - | - | - | O | - | O | O | O |
| Multimodal | - | O | - | - | - | - | O | O | - | O | - | - | - | - | - | - |
| Memory | - | - | - | - | - | - | - | - | - | - | O | - | - | - | - | - |
| Validator | O | O | - | - | O | O | - | - | - | - | - | - | - | - | - | - |
| Recovery | - | O | - | - | O | - | - | - | - | - | O | - | - | - | - | - |
| UI | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| Designer | O | O | - | - | - | - | O | O | - | - | - | - | - | O | - | - |

---

## 6. 플랜별 실행 정책

### 6.1 FREE

```
default_model:            fast
max_parallel_agents:      1
max_tool_calls/request:   4
max_retrieval_rounds:     1
reasoning_mode:           low
compaction_mode:          aggressive
session_memory_retention: short
input_token_budget:       12,000
output_token_budget:      3,000
reasoning_budget:         2,000
total_request_budget:     20,000
sandbox_timeout:          10s
image_generate/day:       3
```

### 6.2 PRO

```
default_model:            standard
coding_model:             coding
fast_model:               fast
max_parallel_agents:      3
max_tool_calls/request:   12
max_retrieval_rounds:     3
reasoning_mode:           medium
compaction_mode:          balanced
session_memory_retention: medium
input_token_budget:       48,000
output_token_budget:      8,000
reasoning_budget:         8,000
total_request_budget:     72,000
sandbox_timeout:          30s
image_generate/day:       50
```

### 6.3 BUSINESS

```
default_model:            standard
hard_reasoning_model:     premium
coding_model:             coding
fast_model:               fast
max_parallel_agents:      6
max_tool_calls/request:   24
max_retrieval_rounds:     5
reasoning_mode:           medium-high
compaction_mode:          conservative
session_memory_retention: long
input_token_budget:       96,000
output_token_budget:      16,000
reasoning_budget:         20,000
total_request_budget:     140,000
sandbox_timeout:          60s
image_generate/day:       200
```

### 6.4 ENTERPRISE

```
default_model:            standard
hard_reasoning_model:     premium
coding_model:             coding
fast_model:               fast
max_parallel_agents:      12
max_tool_calls/request:   50
max_retrieval_rounds:     8
reasoning_mode:           high
compaction_mode:          conservative
session_memory_retention: very_long
input_token_budget:       160,000
output_token_budget:      24,000
reasoning_budget:         40,000
total_request_budget:     240,000
sandbox_timeout:          120s
image_generate/day:       1,000
```

---

## 부록: 구현 우선순위

### Phase 1 (MVP — 6개 에이전트)

```
1. Governor Agent        — 라우팅 + 예산
2. Knowledge Agent       — web_search + vector_search
3. Coding Agent          — file_read/write/edit + shell_exec + git_ops
4. Data Agent            — code_sandbox + data_analyze
5. Memory Agent          — vector_search + compaction
6. Validator Agent       — structural + semantic
```

### Phase 2 (확장)

```
7. Recovery Agent        — failure classification + retry
8. UI Agent              — response formatting
9. Multimodal Agent      — image_understand + image_generate
```

### Phase 3 (완성)

```
10. Automation Agent     — api_call + calendar + email
11. Designer Agent       — layout + review + suggest
```

---

## 부록: 기존 시스템과의 매핑

### 현재 yua-shared/tool 타입과의 관계

| 기존 YuaToolType | 새 에이전트 | 새 도구 |
|-------------------|-----------|---------|
| FILE_ANALYZER | Data Agent | file_read + data_analyze |
| TABLE_EXTRACTOR | Data Agent | data_analyze |
| WEB_DEEP_FETCH | Knowledge Agent | web_search + browser_use |
| SQL_RUNNER | Data Agent | code_sandbox |
| API_CALLER | Automation Agent | api_call |
| SEMANTIC_MEMORY_QUERY | Memory Agent | vector_search |
| REPORT_COMPOSER | UI Agent | (내장) |
| PII_REDACTOR | Validator Agent | (내장) |
| POLICY_CHECKER | Validator Agent | (내장) |

### 현재 ExecutionEngine과의 관계

기존 `execution-engine.ts`의 단일 실행 파이프라인을 분해:

```
기존: User → ExecutionEngine → OpenAI Runtime → Stream → Response
신규: User → Governor → Agent Router → [Agent Pool] → Validator → UI Agent → Response
```

- `execution-planner.ts` → Governor Agent의 plan 생성 부분으로 흡수
- `continuation-decision.ts` → Governor Agent의 replanning 기능으로 흡수
- `tool-runner.ts` → 각 에이전트가 직접 도구를 호출하는 구조로 변환
- `activity-aggregator.ts` → Governor Agent의 DAG 관리 + UI Agent의 진행 표시

---

> **다음 단계:** 이 문서를 기반으로 `yua-shared/agent/` 디렉토리에 타입 정의를 생성하고, `yua-backend/src/ai/agent/` 디렉토리에 각 에이전트 구현체를 배치한다.
