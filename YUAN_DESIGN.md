
---

✅ YUAN 병렬 오케스트레이터 — 핵심 구조

Governor (Opus)  
 └─ 전체 목표 이해  
 └─ 전략 결정  
 └─ 실패 시 재계획 판단  
  
       ↓  
  
Planner  
 └─ 작업 분해  
 └─ DAG 생성  
 └─ 병렬 가능 구간 분석  
  
       ↓  
  
Executor A (Sonet)  
Executor B (Sonet)  
Executor C (Sonet)  
 └─ 병렬 API 호출  
 └─ 파일 수정  
 └─ 코드 생성  
 └─ 명령 실행  
  
       ↓  
  
Validator  
 └─ 결과 검증  
 └─ 테스트 실행  
 └─ diff 확인  
  
       ↓  
  ┌────────┬────────┐  
  │              │              │  
[성공]        [실패]        [부분 성공]  
  │              │              │  
.yuan/ 메모리 저장  Error Recovery Loop  부분 재실행  
``  
  
---  
  
## ✅ Error Recovery Loop 구조  
  
```text  
1. 에러 로그 수집  
2. 실패 원인 추론 (LLM 분석)  
3. 수정 패치 생성  
4. 재실행  
5. 최대 N회 반복  
``  
  
---  
  
## ✅ Context Compaction (직접 구현 방식)  
  
```text  
[system]  
[초반 대화]  
[중간 작업 로그]  
[최근 작업]  
  
→ 토큰 한계 도달  
  
1. 오래된 대화 요약  
2. 요약본을 .yuan/memory/ 에 저장  
3. 최근 N개 대화는 유지  
4. 새 컨텍스트 = [system + 요약본 + 최근 N개]  
``  
  
---  
  
## ✅ 병렬 실행 구조 (개념 흐름)  
  
```text  
Task DAG:  
  
       Root  
      /   \  
  Task A  Task B  
     |        |  
  Task C    Task D  
  
실행 방식:  
- A, B → 동시에 실행  
- C는 A 끝나야 실행  
- D는 B 끝나야 실행  
``  
  
---  
  
## ✅ 필수 기능 스택 (요약 버전)  
  
```text  
Core:  
- Streaming  
- Interrupt  
- Parallel Executors  
- Context Compaction  
- File Read/Write  
- Shell Execution  
- Diff Apply  
- Memory (.yuan/)  
- Error Auto Fix Loop  
``  
  
---  
  
## ✅ CLI vs Desktop 차이 (코드 블록 정리)  
  
```text  
CLI:  
- 실시간 토큰 스트리밍  
- stdin interrupt  
- ASCII UI  
- npx yuan 실행  
  
macOS Desktop:  
- CLI 기능 포함  
- 메뉴바 상태 표시  
- 백그라운드 실행  
- DAG 시각화 대시보드  
- 드래그앤드롭 컨텍스트 추가  
``  
  
---  
  
필요하면    
👉 이걸 **실제 코드 구조 (TypeScript 폴더 설계)**로도 뽑아줄까?    
아니면 **Go/Rust 아키텍처 버전**으로 정리해볼까?  
  
어느 방향으로 더 파고들지 정해보자 😎  
  
이거어때보임? Yua가 짜줌

좋다. 꽤 잘 짰어.

딱 봤을 때 “에이전트 런타임을 실제 제품으로 만들려는 사람”의 구조라서, 그냥 멋있어 보이는 다이어그램 수준은 이미 넘어가 있음.
특히 좋은 점은 이거야:

1. Governor / Planner / Executor / Validator 분리가 명확함
이건 진짜 중요해.
많은 구조가 “모델 하나가 다 한다”로 무너지는데, 이건 역할 경계가 살아 있어서 확장하기 좋음.

2. DAG 기반 병렬 실행을 전제로 둔 게 좋음
여기서부터 그냥 챗봇이 아니라 작업 오케스트레이터가 됨.
YUA를 단순 응답기가 아니라 실행 엔진으로 키우려는 방향이랑 잘 맞아.

3. Error Recovery Loop가 구조 안에 들어가 있음
이거 없으면 데모는 되는데 실사용에서 바로 죽음.
처음부터 recovery를 1급 시민으로 둔 건 아주 좋음.

4. Context Compaction을 명시한 게 좋음
대부분 여기서 나중에 망가짐.
처음부터 .yuan/memory 같은 외부 메모리 계층을 둔 건 현실적이야.


---

근데, 진짜 제품으로 갈 거면 몇 군데는 더 단단하게 박아야 해.

내가 보기엔 꼭 추가돼야 하는 것

1. Planner와 Executor 사이에 Execution Contract

지금 구조는 예쁘지만, 실제로 돌리면 금방 이런 문제 생김:

Executor가 task를 제멋대로 해석

입력/출력 형식이 흔들림

병렬 결과 merge가 불안정

Validator가 뭘 검증해야 하는지 모호해짐


그래서 task마다 최소한 이런 계약이 있어야 해:

TaskContract
- id
- goal
- dependencies[]
- input_schema
- output_schema
- allowed_tools
- side_effect_level
- retry_policy
- success_criteria

이거 없으면 나중에 Governor가 똑똑해져도 밑단이 흐물흐물해져.


---

2. Validator를 하나로 두지 말고 2단계로 쪼개는 게 좋음

지금은 Validator가 결과 검증/테스트/diff 확인을 다 먹는데, 실제론 두 종류야:

Structural Validator
- 포맷 맞는가
- 파일 생성됐는가
- 명령 성공했는가
- schema 통과했는가

Semantic Validator
- 의도 달성했는가
- 코드가 요구사항에 맞는가
- 회귀가 없는가
- 품질이 충분한가

이렇게 나누면 recovery loop가 훨씬 정확해져.
“실패”가 아니라 어떤 종류의 실패인지 알 수 있으니까.


---

3. Error Recovery Loop에 원인 분류 코드가 필요함

지금은:

1. 에러 로그 수집


2. 실패 원인 추론


3. 수정 패치 생성


4. 재실행



이건 좋은데, 그대로 구현하면 무한 땜질 머신 될 가능성 높아.

최소한 이렇게 분류해야 해:

FailureType
- TRANSIENT        # 일시적 API 실패, 타임아웃
- TOOL_MISUSE      # 잘못된 명령, 잘못된 파라미터
- LOGIC_ERROR      # 코드/추론 자체 오류
- CONTEXT_LOSS     # 필요한 맥락 누락
- SPEC_MISMATCH    # 요구사항 오해
- VALIDATION_FAIL  # 테스트/품질 기준 미달

이렇게 되면 recovery가 달라짐:

TRANSIENT → 재시도

CONTEXT_LOSS → 컨텍스트 보강

SPEC_MISMATCH → Planner 재계획

LOGIC_ERROR → patch 생성

VALIDATION_FAIL → refinement


이 분기 없으면 실패할 때마다 무조건 “패치 생성”으로 가서 금방 꼬여.


---

4. Governor는 “전체 목표 이해”보다 정책 엔진이어야 함

지금 설명은 약간 추상적이야.
실제로 Governor는 이런 책임을 가져야 훨씬 강해짐:

Governor
- global objective tracking
- budget control (time/token/cost)
- risk policy
- replanning decision
- stop/continue/rollback decision
- memory write approval

즉, “똑똑한 상위 모델”이 아니라
전체 실행 정책을 결정하는 컨트롤 타워로 잡는 게 좋아.


---

5. .yuan/ memory는 그냥 저장소가 아니라 계층화가 필요함

지금은 메모리 저장이라고만 돼 있는데, 실제론 종류가 달라.

.yuan/
  memory/
    session/      # 현재 실행 중 요약, 최근 상태
    project/      # 프로젝트 구조, conventions, important facts
    recovery/     # 실패 패턴, 자주 깨지는 지점
    artifacts/    # 생성된 계획, DAG, patch, reports

이렇게 쪼개야 나중에 compaction/recall이 쉬워져.


---

제일 좋은 포인트 하나

이 구조는 YUA 철학이랑 잘 맞음.
왜냐면 네가 계속 잡고 있는 방향이:

단일 거대 블랙박스 금지

역할 분리

SSOT 유지

실행과 판단 분리

복구 루프 내장


이거잖아.
그래서 그냥 “Claude Code 비슷한 거 만들자”가 아니라,
YUA식 제어 가능한 에이전트 런타임으로 발전시킬 수 있는 뼈대가 맞아.


---

내가 주는 한 줄 평가

구조는 꽤 좋고, 방향도 맞다.
다만 지금 상태는 개념 설계 80점,
실전 런타임으로 가려면 아래 4개를 추가해야 95점 이상 된다:

1. TaskContract
2. FailureType taxonomy
3. Structural/Semantic validator 분리
4. Governor의 policy-engine화


---

좋아. 그럼 **“범용 AI 플랫폼 (ChatGPT / Gemini 스타일)”**을 목표로 할 때
**어떤 에이전트들을 기본 세트로 가져가야 하는지** 정리해줄게.

핵심은 이거다:

> **코딩 에이전트 하나만 있으면 플랫폼이 아니라 도구가 된다.**
> 플랫폼은 **여러 전문 에이전트 + 메인 오케스트레이터 구조**여야 한다.

그래서 아래는 **YUA 범용 플랫폼 기준 권장 에이전트 세트**다.

---

# 1️⃣ Core Agent (필수)

이건 플랫폼의 심장이다.

### Governor / Orchestrator Agent

역할

```
- 사용자 의도 이해
- 어떤 에이전트 호출할지 결정
- 병렬 실행 조정
- 충돌 방지
- 비용 / 토큰 / 시간 관리
```

실제 구조

```
User
 ↓
Governor
 ↓
Agent Router
 ↓
Specialized Agents
```

추천 모델

```
GPT-5.4
```

이유

* reasoning
* planning
* routing

---

# 2️⃣ Knowledge / Search Agent

범용 플랫폼에서 **가장 많이 쓰이는 에이전트**

역할

```
- 웹 검색
- 문서 검색
- RAG
- 논문 / 기술 문서 탐색
- 최신 정보 수집
```

기능

```
web search
vector search
rerank
summarization
citation 생성
```

추천 모델

```
GPT-5.4
또는 gpt-5-mini
```

---

# 3️⃣ Coding Agent

Claude Code 스타일

역할

```
- 코드 생성
- 코드 수정
- 리팩토링
- 테스트 작성
- diff 생성
```

기능

```
read file
write file
apply patch
run tests
lint
```

추천 모델

```
GPT-5-Codex
또는 GPT-5.4
```

---

# 4️⃣ Data / Analysis Agent

이거 없으면 플랫폼이 약해진다.

역할

```
- 데이터 분석
- 통계
- 시각화
- CSV / Excel 처리
- Python 계산
```

툴

```
Python sandbox
pandas
numpy
matplotlib
```

추천 모델

```
GPT-5.4
```

---

# 5️⃣ Automation / Tool Agent

사용자 대신 작업 수행

역할

```
- API 호출
- 시스템 자동화
- 일정 / 이메일
- 워크플로우 실행
```

예

```
Notion
Slack
Google Docs
GitHub
```

추천 모델

```
gpt-5-mini
```

이유

자동화는 reasoning보다 **tool orchestration**이 중요함.

---

# 6️⃣ Multimodal Agent

요즘 플랫폼에서 필수

역할

```
- 이미지 이해
- 이미지 생성
- OCR
- 영상 요약
```

추천 모델

```
GPT-5.4 + image models
```

---

# 7️⃣ Memory Agent

플랫폼 핵심

역할

```
- 사용자 기억
- 프로젝트 기억
- 대화 요약
- context compaction
```

저장

```
vector db
graph memory
session memory
```

추천 모델

```
gpt-5-mini
```

---

# 8️⃣ Safety / Validator Agent

이거 없으면 플랫폼 위험해진다.

역할

```
- hallucination 검사
- 코드 검증
- 사실 검증
- 보안 검사
```

구조

```
result
 ↓
validator
 ↓
approve / refine
```

추천 모델

```
GPT-5.4
```

---

# 9️⃣ Recovery Agent

에이전트 시스템에서 매우 중요

역할

```
- 실패 원인 분석
- 재시도 전략
- patch 생성
```

예

```
API 실패
코드 실패
테스트 실패
```

추천 모델

```
GPT-5.4-pro
```

---

# 🔟 UI / Interaction Agent

플랫폼 UX 담당

역할

```
- 응답 포맷팅
- 표 / 코드 / 그래프 생성
- 설명 최적화
```

추천 모델

```
gpt-5-mini
```

---

# 전체 구조

플랫폼은 결국 이렇게 된다.

```
User
 ↓
Governor Agent
 ↓
Agent Router
 ├ Knowledge Agent
 ├ Coding Agent
 ├ Data Agent
 ├ Automation Agent
 ├ Multimodal Agent
 ├ Memory Agent
 └ Validator Agent
```

그리고

```
Recovery Agent
```

은 실패 시 호출된다.

---

# 병렬 실행 예

사용자 질문

```
"이 논문 분석하고 관련 코드 구현해줘"
```

시스템

```
Governor
 ├ Knowledge Agent (논문 분석)
 ├ Coding Agent (코드 작성)
 └ Validator Agent (검증)
```

병렬 실행.

---

# YUA 플랫폼 추천 에이전트 목록 (최종)

```
1 Governor / Orchestrator
2 Knowledge / Search
3 Coding
4 Data / Analysis
5 Automation / Tools
6 Multimodal
7 Memory
8 Validator / Safety
9 Recovery
10 UI / Interaction
```

이 10개면 **ChatGPT / Gemini 급 범용 플랫폼 기본 세트**다.

---

# 모델 배치 추천

```
Governor          GPT-5.4
Knowledge         GPT-5.4
Coding            GPT-5-Codex
Data              GPT-5.4
Automation        gpt-5-mini
Multimodal        GPT-5.4
Memory            gpt-5-mini
Validator         GPT-5.4
Recovery          GPT-5.4-pro
UI Agent          gpt-5-mini
```

---

# 마지막 중요한 조언

범용 플랫폼 만들 때 **실패하는 이유 대부분이 이것**이다.

```
에이전트를 너무 많이 만든다
```

그래서 처음엔

```
Governor
Knowledge
Coding
Data
Memory
Validator
```

**6개만 먼저 만들어라.**

나머지는 확장.

---
좋아.
지금 필요한 건 **“좋아 보이는 개요”가 아니라 문서 초안에 바로 넣을 수 있는 기능 추가 항목**이니까,
각 에이전트별로 **필수 기능 / 있으면 강한 기능 / 나중 확장 기능**까지 한 번에 정리해줄게.

아래 내용은 그대로 복붙해서 초안에 넣기 쉽게 **코드블록 중심**으로 적을게.

---

# YUA 범용 AI 플랫폼 — 에이전트별 기능 추가 제안서

## 1. Governor / Orchestrator Agent — 기능 추가안

```text
역할:
- 사용자 의도 해석
- 어떤 에이전트를 호출할지 결정
- 병렬/직렬 실행 정책 결정
- 충돌 방지
- 비용/시간/품질 밸런스 조정
- 실패 시 재계획 여부 결정
```

### 추가해야 할 핵심 기능

```text
1) Intent Classification
- 질문형 / 실행형 / 분석형 / 생성형 / 자동화형 / 혼합형 분류

2) Agent Routing Policy
- 어떤 에이전트를 몇 개 호출할지 결정
- 병렬 호출 가능 여부 판단
- 저비용 경로 / 고품질 경로 선택

3) Budget Controller
- max_tokens
- max_latency
- max_tool_calls
- max_parallel_agents
- max_cost_per_request

4) Replanning Engine
- 중간 실패 시 전체 계획 재구성
- 부분 성공 시 남은 태스크만 재배치
- 실패 원인이 spec mismatch면 planner 재호출

5) Conflict Arbitration
- 에이전트 간 결과 충돌 시 우선순위 판정
- 코드 수정 충돌 / 문서 충돌 / 사실 충돌 조정

6) Final Response Composer Trigger
- 최종 사용자 응답을 어떤 형식으로 낼지 결정
- 요약형 / 자세한형 / 실행형 / 보고서형 선택
```

### 있으면 강한 기능

```text
- user tier 기반 실행 정책
  예: free는 단일 agent 위주, pro는 병렬/심층 분석 허용

- request criticality 감지
  예: 의료/법률/금융은 validator 강화

- long-horizon task mode
  예: 복합 요청일 경우 multi-stage orchestration 활성화
```

---

## 2. Knowledge / Search Agent — 기능 추가안

```text
역할:
- 웹 검색
- 문서 검색
- 최신 정보 수집
- RAG
- citation 포함 요약
```

### 추가해야 할 핵심 기능

```text
1) Multi-Source Search
- web
- internal docs
- uploaded files
- connectors (drive, notion, github 등)

2) Query Rewriting
- 원 질문을 검색 친화형 쿼리로 재작성
- 다국어 쿼리 확장
- 시간 민감성 반영

3) Source Ranking / Reranking
- 최신성
- 신뢰도
- 질의 적합도
- 중복 제거

4) Citation Builder
- 답변 문장별 근거 연결
- load-bearing claim 위주 인용

5) Evidence Packaging
- 핵심 근거 3~5개 추출
- 상충 정보 있을 때 viewpoint 분리

6) Freshness Detection
- 최신 정보 필요한 요청 감지
- 웹 검색 강제 여부 판단
```

### 있으면 강한 기능

```text
- "내부 문서 우선, 부족하면 웹 보강" 정책
- PDF / slide / image 포함 문서 읽기
- snippet 기반이 아니라 full-context evidence mode
- search trace 저장
```

---

## 3. Coding Agent — 기능 추가안

```text
역할:
- 코드 생성
- 코드 수정
- 리팩토링
- 테스트 작성
- 버그 수정
```

### 추가해야 할 핵심 기능

```text
1) Repository Awareness
- 프로젝트 구조 파악
- 의존성 그래프 파악
- 기존 코드 스타일 / 컨벤션 파악

2) Patch-First Editing
- 직접 overwrite 금지
- diff / patch 기반 수정
- 변경 파일 목록 명시

3) Code Planning
- 수정 전에 영향 범위 분석
- 관련 파일 후보 추출
- 테스트 영향 예측

4) Test Coupling
- 코드 수정 후 자동으로 관련 테스트 생성/수정
- 최소 smoke / unit / regression test 후보 제안

5) Safe Execution
- 허용된 shell command만 실행
- 위험 명령 차단
- dry-run 우선

6) Review-Aware Output
- 변경 이유
- 리스크
- 롤백 포인트
- follow-up 필요 여부 출력
```

### 있으면 강한 기능

```text
- AST 기반 심볼 단위 수정
- semantic code search
- issue → fix plan → patch → test 자동 루프
- multi-file refactor mode
- framework-aware templates
  예: Next.js / FastAPI / Django / React / NestJS
```

---

## 4. Data / Analysis Agent — 기능 추가안

```text
역할:
- 데이터 분석
- 통계 계산
- 시각화
- CSV/Excel 처리
- Python 기반 계산
```

### 추가해야 할 핵심 기능

```text
1) Structured File Intake
- csv
- xlsx
- json
- parquet
- txt table

2) Data Profiling
- 컬럼 타입 추론
- 결측치/이상치 탐지
- 분포 요약
- 데이터 품질 진단

3) Analysis Templates
- 요약 통계
- 비교 분석
- 시계열 분석
- 분류/회귀 초안
- cohort/funnel 분석

4) Visualization Generation
- line
- bar
- scatter
- histogram
- heatmap
- report-friendly chart

5) Notebook-Free Execution
- sandbox에서 바로 계산
- 파일 저장
- 결과 artifact 링크 제공

6) Interpretation Layer
- 숫자 설명
- 함정 경고
- 과도한 해석 방지
```

### 있으면 강한 기능

```text
- 데이터 사전 자동 생성
- SQL 질의 생성 및 검증
- 대시보드용 chart spec 출력
- 분석 결과를 보고서 문체로 자동 변환
```

---

## 5. Automation / Tool Agent — 기능 추가안

```text
역할:
- 외부 서비스 연동
- 워크플로우 실행
- 반복 작업 자동화
- 시스템 액션 호출
```

### 추가해야 할 핵심 기능

```text
1) Connector Action Routing
- gmail
- calendar
- docs
- github
- slack/notion 등

2) Action Validation
- 파라미터 검증
- 대상 리소스 확인
- 권한 확인

3) Dry Run / Preview
- 실제 실행 전 예상 변경 사항 표시
- 메시지/일정/문서 수정 preview

4) Idempotency Protection
- 중복 실행 방지
- 동일 작업 재호출 감지

5) Task Chaining
- 검색 → 요약 → 문서 작성 → 공유
- 일정 확인 → 시간 제안 → 알림 설정

6) Audit Trail
- 어떤 액션을 언제 왜 실행했는지 로그
```

### 있으면 강한 기능

```text
- 정책 기반 action approval
- 반복 workflow template 저장
- failure rollback plan
- human-in-the-loop 승인 단계
```

---

## 6. Multimodal Agent — 기능 추가안

```text
역할:
- 이미지 이해
- 이미지 생성
- 문서 내 시각 요소 해석
- OCR 보조
- 비주얼 요약
```

### 추가해야 할 핵심 기능

```text
1) Image Understanding
- 객체/장면/텍스트/레이아웃 파악
- 차트/표/스크린샷 해석

2) Document Visual Reading
- PDF 내 도표/표/슬라이드 이미지 인식
- 텍스트와 시각 요소 결합 해석

3) Image Generation Routing
- 설명도 / 다이어그램 / 일러스트 / 합성 이미지 생성

4) Screenshot Interpretation
- UI 버그 분석
- 앱 화면 설명
- 디자인 비교

5) OCR Assist Mode
- 텍스트 추출이 필요할 때만 보조적으로 사용

6) Multimodal Summarization
- 텍스트 + 이미지 합쳐서 요약
```

### 있으면 강한 기능

```text
- before/after 이미지 비교
- 프레젠테이션 슬라이드 분석
- chart-to-text 설명 자동화
- 이미지 생성 결과를 보고서/문서 asset으로 연결
```

---

## 7. Memory Agent — 기능 추가안

```text
역할:
- 사용자 선호 기억
- 프로젝트 맥락 저장
- 세션 요약
- context compaction
```

### 추가해야 할 핵심 기능

```text
1) Session Memory
- 최근 대화 핵심 상태 저장
- 장기 태스크 진행 상태 저장

2) Project Memory
- 프로젝트 구조
- 약속된 규칙
- 중요 파일/결정/금지사항 저장

3) User Preference Memory
- 선호 톤
- 작업 방식
- 반복 요청 패턴
- 자주 쓰는 포맷

4) Context Compaction
- 오래된 대화 요약
- 최근 중요 turn 유지
- 요약 품질 검증

5) Memory Retrieval Policy
- 언제 메모리를 주입할지 결정
- 과거 메모리 우선순위 관리

6) Memory Safety
- 민감 정보 저장 제한
- user-confirmed memory만 저장
```

### 있으면 강한 기능

```text
- memory TTL
- contradiction detection
- memory merge / overwrite policy
- session memory와 project memory 분리 주입
```

---

## 8. Validator / Safety Agent — 기능 추가안

```text
역할:
- 결과 검증
- 사실성/품질 검증
- 안전성 점검
- 출력 승인/반려
```

### 추가해야 할 핵심 기능

```text
1) Structural Validation
- 형식 검증
- schema 검증
- 파일 존재 여부
- 명령 성공 여부
- 테스트 통과 여부

2) Semantic Validation
- 사용자 의도 충족 여부
- 요구사항 누락 탐지
- 논리 일관성 검사
- 회귀 위험 평가

3) Factual Validation
- 최신 정보 요구 시 근거 확인
- citation 누락 탐지
- unsupported claim 표시

4) Safety Validation
- 정책 위반 탐지
- 위험한 조언/행동 차단
- 민감 분야 강화 검증

5) Confidence Scoring
- 결과 신뢰도 수치화
- 낮은 확신 시 추가 검색/검증 유도
```

### 있으면 강한 기능

```text
- validator disagreement mode
- 코드/텍스트/데이터별 validator 분리
- self-check 결과와 independent-check 결과 분리
```

---

## 9. Recovery Agent — 기능 추가안

```text
역할:
- 실패 원인 분석
- 재시도 전략 결정
- 수정 패치 생성
- 부분 재실행 설계
```

### 추가해야 할 핵심 기능

```text
1) Failure Classification
- TRANSIENT
- TOOL_MISUSE
- LOGIC_ERROR
- CONTEXT_LOSS
- SPEC_MISMATCH
- VALIDATION_FAIL
- CONFLICT_FAIL

2) Recovery Policy Mapping
- failure type별 대응 전략 고정
- 무조건 patch 생성 금지

3) Retry Budget Control
- 최대 재시도 횟수
- 재시도 간격
- escalating strategy

4) Root Cause Snapshot
- 실패 당시 입력
- tool output
- stderr/stdout
- patch history
- validator result 저장

5) Partial Re-execution
- 전체 재실행 대신 실패 task만 재수행
- dependency 그래프 기준 영향 범위 계산
```

### 있으면 강한 기능

```text
- recovery memory 축적
- 반복 실패 패턴 탐지
- 동일 에러 재발 방지 rule 자동 제안
```

---

## 10. UI / Interaction Agent — 기능 추가안

```text
역할:
- 최종 응답 포맷팅
- 설명 스타일 조정
- 표/그래프/코드블록 정리
- 사용자 친화적 표현 최적화
```

### 추가해야 할 핵심 기능

```text
1) Response Mode Selection
- 짧은 답변
- 자세한 설명
- 보고서형
- 튜토리얼형
- 실행형 체크리스트형

2) Artifact Formatting
- 문서
- 표
- 코드블록
- 슬라이드용 요약
- 이메일/메시지 초안

3) Audience Adaptation
- 비개발자용
- 개발자용
- 임원 보고용
- 고객 공유용

4) Visual Packaging
- 제목/섹션 구조화
- 읽기 쉬운 단계 정리
- 핵심 요약 강조

5) Follow-up Hint Generation
- 다음 액션 제안
- 리스크/주의점 표시
```

### 있으면 강한 기능

```text
- 동일 결과를 여러 톤으로 재포장
- 발표용 / 문서용 / 채팅용 버전 동시 생성
- 내부 trace를 사용자 친화 설명으로 변환
```

---

# 추가로 새로 넣으면 좋은 에이전트 4개

지금 10개도 괜찮은데, 범용 플랫폼이면 아래 4개는 나중에 꽤 강력해진다.

## 11. Personalization Agent

```text
역할:
- 사용자별 응답 스타일 최적화
- 선호 포맷 학습
- 개인화된 추천
- 반복 작업 패턴 반영
```

기능 추가안

```text
- preferred answer length 반영
- domain preference 반영
- language/tone preference 반영
- recurring task template 추천
```

---

## 12. Collaboration Agent

```text
역할:
- 다중 사용자/워크스페이스 협업 보조
- 문서/작업 공유 흐름 관리
- 팀 컨텍스트 정리
```

기능 추가안

```text
- shared context packaging
- 팀용 요약 생성
- 회의 후 액션 아이템 추출
- shared memory candidate 분리
```

---

## 13. Planning / Project Agent

이건 Governor랑 다름.
Governor가 라우팅/정책이면, 이건 **장기 작업 관리** 쪽이다.

```text
역할:
- 장기 태스크 관리
- 마일스톤 분해
- 진행 상태 추적
- deliverable 계획
```

기능 추가안

```text
- task graph 생성
- milestone tracking
- dependency visualization
- next-best-action 제안
```

---

## 14. Evaluation Agent

Validator보다 더 “평가 전용”이다.

```text
역할:
- 모델/에이전트 성능 평가
- A/B 비교
- 품질 메트릭 기록
- 시스템 개선 피드백 생성
```

기능 추가안

```text
- answer quality scoring
- tool success rate tracking
- latency/cost/quality tradeoff 분석
- regression benchmark 관리
```

---

# 문서 초안에 바로 넣기 좋은 “최종 기능표”

```text
1. Governor / Orchestrator
- intent classification
- agent routing
- budget control
- replanning
- conflict arbitration
- final response policy

2. Knowledge / Search
- multi-source search
- query rewriting
- reranking
- citation builder
- evidence packaging
- freshness detection

3. Coding
- repository awareness
- patch-first editing
- code planning
- test coupling
- safe execution
- review-aware output

4. Data / Analysis
- structured file intake
- data profiling
- analysis templates
- visualization generation
- sandbox execution
- interpretation layer

5. Automation / Tool
- connector routing
- action validation
- dry run
- idempotency protection
- task chaining
- audit trail

6. Multimodal
- image understanding
- document visual reading
- image generation routing
- screenshot interpretation
- OCR assist mode
- multimodal summarization

7. Memory
- session memory
- project memory
- user preference memory
- context compaction
- retrieval policy
- memory safety

8. Validator / Safety
- structural validation
- semantic validation
- factual validation
- safety validation
- confidence scoring

9. Recovery
- failure classification
- recovery policy mapping
- retry budget control
- root cause snapshot
- partial re-execution

10. UI / Interaction
- response mode selection
- artifact formatting
- audience adaptation
- visual packaging
- follow-up hint generation
```

---

# 내가 추천하는 문서 구조

초안 쓰는 중이면 각 에이전트 섹션을 이렇게 통일하면 깔끔하다.

```text
[Agent Name]

1. 목적
2. 핵심 역할
3. 입력
4. 출력
5. 사용 가능한 도구
6. 권한 수준
7. 핵심 기능
8. 실패 시 처리
9. 다른 에이전트와의 연결
10. 향후 확장 기능
```

이 포맷으로 쓰면 나중에 바로 **설계 문서 → 타입 정의 → 구현 태스크**로 연결된다.

원하면 다음 답변에서 내가 이걸 바로
**“에이전트별 공식 문서 초안 템플릿” 형태로 10개 전부 채운 버전**으로 써줄게.


좋아.
이건 초안 문서에 바로 붙일 수 있게 **복붙형 명세**로 줄게.

그리고 한 가지 먼저 정정하면, 지금 OpenAI 공식 문서 기준 최신 모델 가이드는 **GPT-5.2 계열**을 중심으로 설명하고 있고, 복잡한 멀티스텝/에이전트 작업엔 `gpt-5.2`, 더 어려운 문제엔 `gpt-5.2-pro`, 코딩 제품엔 `gpt-5.2-codex`, 비용 최적화엔 `gpt-5-mini`를 권장한다. 또 최신 GPT-5.2 가이드에는 **compaction**이 새 컨텍스트 관리 기능으로 포함돼 있다. 에이전트 구축은 **Responses API + Agents SDK** 조합이 현재 공식 기본 축이다. ([OpenAI 플랫폼][1])

---

# 1. Compact 기능 초안

```text
[Feature Name]
Context Compaction

[목적]
- 긴 대화 / 긴 작업 / 장기 세션에서 컨텍스트 길이를 제어한다.
- 오래된 정보를 버리는 것이 아니라 "압축 + 재주입 가능 상태"로 유지한다.
- 모델 입력 토큰을 안정적으로 제한하면서도 작업 연속성을 보존한다.

[핵심 원칙]
- system prompt는 절대 손상하지 않는다.
- 최근 작업 컨텍스트는 최대한 원문 유지한다.
- 오래된 대화는 요약하되, 결정사항/금지사항/열린 이슈는 구조적으로 보존한다.
- compaction은 단순 요약이 아니라 "재실행 가능한 상태 압축"이어야 한다.

[입력]
- system instructions
- conversation history
- agent traces
- tool results
- memory store(.yuan/memory/*)
- active plan / task graph
- unresolved issues

[출력]
- compacted_context
- compact_summary
- pinned_facts
- unresolved_items
- dropped_ranges
- retrieval_hints

[발동 조건]
1) total_context_tokens > soft_limit
2) long-running session detected
3) parallel agent traces accumulate
4) repeated tool logs exceed threshold
5) background tasks create excessive state

[압축 계층]
L0: system / policies / safety / immutable rules
L1: active task state
L2: pinned project facts
L3: recent conversation window
L4: summarized historical context
L5: archived raw traces (external memory only)

[압축 알고리즘]
1. system / policy / safety block 유지
2. active plan / current task / unresolved issue 유지
3. 최근 N개 turn 원문 유지
4. 오래된 대화는 summary block으로 변환
5. tool stdout/stderr는 raw fulltext 대신 structured result로 축약
6. patch / diff / decision / failure는 artifact reference로 대체
7. compacted_context = [system + pinned facts + active plan + summary + recent turns]

[요약 시 반드시 보존할 항목]
- user goals
- confirmed decisions
- constraints / prohibitions
- file paths / entities / ids
- unresolved blockers
- previous failures and why they failed
- next expected action

[저장 구조]
.yuan/
  memory/
    session/
      latest_compact.json
      compact_history.jsonl
    project/
      pinned_facts.json
      conventions.json
    recovery/
      repeated_failures.json
    artifacts/
      plans/
      summaries/
      traces/

[Compact Summary 예시 스키마]
{
  "session_id": "string",
  "summary_version": 1,
  "user_goal": ["..."],
  "confirmed_decisions": ["..."],
  "constraints": ["..."],
  "open_issues": ["..."],
  "important_entities": ["..."],
  "recent_completed_steps": ["..."],
  "next_expected_action": "..."
}

[실패 방지 규칙]
- compact 후 semantic drift 검증
- compact summary와 최근 원문 간 contradiction 검사
- safety / policy / tool permission 정보는 절대 요약 손실 금지
- unresolved issue가 요약에서 빠지면 compaction 실패로 간주

[추가 옵션]
- compact_mode = conservative | balanced | aggressive
- preserve_recent_turns = N
- preserve_raw_tool_logs = true/false
- preserve_failed_attempts = true/false
```

OpenAI 최신 모델 가이드는 GPT-5.2에 **context management using compaction**을 명시하고 있고, Responses API는 이전 Assistant 계열보다 더 유연한 상태 관리/도구 결합 흐름을 중심으로 설계돼 있다. 그래서 YUA도 compaction을 “부가기능”이 아니라 런타임 핵심 기능으로 잡는 게 맞다. ([OpenAI 플랫폼][1])

---

# 2. 플랜별 토큰 정책 초안

여기서 “토큰 플랜”은 모델 과금 플랜이 아니라 **제품 기능 플랜별 사용 한도 정책** 초안으로 잡는 게 좋다.

```text
[Feature Name]
Plan-based Token and Execution Budget Policy

[목적]
- 사용자 플랜별로 품질 / 속도 / 비용을 제어한다.
- 단순 "토큰 수"가 아니라 모델 등급, reasoning depth, 병렬 agent 수, 검색 강도까지 함께 제어한다.

[공통 개념]
- input_token_budget
- output_token_budget
- reasoning_budget
- tool_call_budget
- parallel_agent_budget
- retrieval_budget
- compaction_threshold
- max_session_memory_size
```

## FREE 초안

```text
Plan: FREE

목표:
- 빠르고 가벼운 기본 사용
- 과도한 멀티에이전트 금지
- 검색/분석/생성은 최소 수준

기본 정책:
- default_model = gpt-5-mini
- max_parallel_agents = 1
- max_tool_calls_per_request = 4
- max_retrieval_rounds = 1
- reasoning_mode = low
- compaction_mode = aggressive
- session_memory_retention = short

권장 예산:
- input_token_budget = 12k
- output_token_budget = 3k
- reasoning_budget = 2k
- total_request_budget = 20k

제한:
- deep research 제한
- heavy coding agent 제한
- long-running automation 제한
- multimodal batch 분석 제한
```

## PRO 초안

```text
Plan: PRO

목표:
- 개인 파워유저
- 코딩/분석/검색을 실사용 수준으로 허용
- 제한적 병렬 오케스트레이션 허용

기본 정책:
- default_model = gpt-5.2
- coding_model = gpt-5.2-codex
- fast_model = gpt-5-mini
- max_parallel_agents = 3
- max_tool_calls_per_request = 12
- max_retrieval_rounds = 3
- reasoning_mode = medium
- compaction_mode = balanced
- session_memory_retention = medium

권장 예산:
- input_token_budget = 48k
- output_token_budget = 8k
- reasoning_budget = 8k
- total_request_budget = 72k

허용:
- 병렬 search + coding + validator
- 고급 파일 분석
- 중간급 automation
- 이미지 이해/생성 기본 지원
```

## BUSINESS 초안

```text
Plan: BUSINESS

목표:
- 팀/워크스페이스 생산성
- 더 긴 세션
- 더 많은 도구 호출
- 협업/감사 로그/안정성 강화

기본 정책:
- default_model = gpt-5.2
- hard_reasoning_model = gpt-5.2-pro
- coding_model = gpt-5.2-codex
- fast_model = gpt-5-mini
- max_parallel_agents = 6
- max_tool_calls_per_request = 24
- max_retrieval_rounds = 5
- reasoning_mode = medium-high
- compaction_mode = conservative
- session_memory_retention = long

권장 예산:
- input_token_budget = 96k
- output_token_budget = 16k
- reasoning_budget = 20k
- total_request_budget = 140k

허용:
- team memory
- long-form analysis
- advanced coding workflows
- more durable automation
- richer audit and trace retention
```

## ENTERPRISE 초안

```text
Plan: ENTERPRISE

목표:
- 고신뢰 장기 작업
- 멀티에이전트 병렬 오케스트레이션
- 정책/권한/감사/복구 최우선

기본 정책:
- default_model = gpt-5.2
- hard_reasoning_model = gpt-5.2-pro
- coding_model = gpt-5.2-codex
- fast_model = gpt-5-mini
- max_parallel_agents = 12
- max_tool_calls_per_request = 50
- max_retrieval_rounds = 8
- reasoning_mode = high
- compaction_mode = conservative
- session_memory_retention = very_long

권장 예산:
- input_token_budget = 160k
- output_token_budget = 24k
- reasoning_budget = 40k
- total_request_budget = 240k

허용:
- deep multi-agent orchestration
- longer workflows
- stronger validation and recovery
- organization-level shared memory
- custom policy / approval layers
```

## 운영 규칙 초안

```text
[운영 규칙]
1. plan은 단순 토큰이 아니라 전체 실행 능력을 제어한다.
2. reasoning_budget 초과 시:
   - 먼저 compact 실행
   - 이후 model downgrade 또는 agent 수 축소
3. tool_call_budget 초과 시:
   - 중복 tool call 제거
   - cached result 재사용
4. total_request_budget 초과 시:
   - user-facing partial completion 허용
   - heavy subtask deferred (동일 응답 내 요약 제안)
5. enterprise 외 플랜은 high-cost recovery loop 횟수 제한
```

OpenAI 공식 가이드는 최신 GPT-5.2 계열을 `gpt-5.2`, `gpt-5.2-pro`, `gpt-5.2-codex`, `gpt-5-mini`, `gpt-5-nano`처럼 역할별로 나눠 소개하고 있어서, YUA도 플랜마다 **모델 등급 + reasoning effort + compaction + tool budget**을 묶어 정책화하는 게 자연스럽다. ([OpenAI 플랫폼][1])

---

# 3. 외부 툴 추천

범용 AI 플랫폼이면 툴을 너무 많이 깔기보다 **역할별 베스트 1개씩** 잡는 게 좋다.

```text
[Recommended External Stack for YUA v1]

1. Durable orchestration
- Temporal

2. Primary database
- PostgreSQL

3. Cache / short-lived eventing
- Redis

4. Vector / semantic retrieval
- Qdrant

5. LLM observability / prompt versioning / evals
- Langfuse

6. Core model runtime
- OpenAI Responses API + Agents SDK

7. File/object storage
- S3 compatible storage or GCS

8. Search fallback
- Native web search through model/tool layer first
```

## 왜 이 조합이 좋냐

```text
Temporal
- 장기 워크플로우
- retry / failure recovery
- durable execution
- agent loop 복구에 강함

PostgreSQL
- 메인 SSOT
- json/jsonb 저장
- relational + semi-structured 혼합 좋음
- full text search도 가능

Redis
- 캐시
- 세션 상태
- rate limit
- 짧은 이벤트 버스
- 단, durable queue 단독 대체로는 비권장

Qdrant
- 문서/메모리/세만틱 검색 전용
- vector + payload filter 조합이 좋음

Langfuse
- trace
- eval
- prompt versioning
- cost/latency 관찰

OpenAI Responses API + Agents SDK
- agent handoff
- streaming
- tool use
- trace
- coding / search / file / shell 연동 중심 개발에 적합
```

Temporal은 공식 문서에서 **durable execution**, 재개 가능한 워크플로우, 자동 retry 정책을 핵심 가치로 설명한다. 장기 에이전트 런타임과 recovery loop에는 꽤 잘 맞는다. ([Temporal Docs][2])

PostgreSQL은 JSON/JSONB와 SQL/JSON 함수, 풀텍스트 서치를 공식적으로 제공하므로, **SSOT + 메타데이터 + 정책 상태 + 세션 기록** 저장소로 쓰기 좋다. ([PostgreSQL][3])

Redis는 캐시와 실시간 상태 전파엔 좋지만, Pub/Sub는 공식적으로 **at-most-once** 전달 특성을 갖기 때문에 “절대 유실되면 안 되는 durable workflow queue”의 유일한 기반으로 두면 위험하다. 그래서 Redis는 캐시/세션/경량 이벤트용으로, 내구성 있는 실행 제어는 Temporal 쪽으로 두는 걸 권장한다. ([Redis][4])

Langfuse는 공식 문서에서 **LLM 앱 tracing, observability, prompt management, evaluation**을 전면에 내세운다. YUA처럼 에이전트/프롬프트/모델 라우팅이 복잡한 시스템에는 특히 잘 맞는다. ([Langfuse][5])

## v1 추천 스택 한 줄 버전

```text
YUA v1 External Stack
- Runtime: OpenAI Responses API + Agents SDK
- Workflow: Temporal
- DB: PostgreSQL
- Cache/Event: Redis
- Vector DB: Qdrant
- Observability/Evals: Langfuse
- Object Storage: S3/GCS
```

---

# 4. UI 꾸미는 디자이너 역할 — 고성능 에이전트 초안

이건 진짜 넣는 게 좋다.
범용 플랫폼이면 “답변 잘하는 모델”만으로는 약하고, **화면/문서/UI를 설계해주는 전문 에이전트**가 있으면 체감이 확 달라진다.

```text
[Agent Name]
Designer / UI Composition Agent

[목적]
- 사용자 요구를 시각 구조로 번역한다.
- 단순 스타일링이 아니라 레이아웃, 정보 구조, UX 흐름, 비주얼 일관성을 설계한다.
- 결과물을 "예쁜 답변"이 아니라 "쓸 수 있는 화면/문서/자산"으로 만든다.

[핵심 역할]
- UI 레이아웃 설계
- 디자인 시스템 적용
- 시각 계층 구조 설계
- 반응형 구조 제안
- 카드 / 테이블 / 대시보드 / 리포트 레이아웃 생성
- 프롬프트 결과를 시각적으로 재포장
- 발표자료 / 보고서 / 랜딩페이지 / 앱 화면 구성

[입력]
- user goal
- audience
- target medium (chat / dashboard / web / slide / report / mobile)
- brand rules
- design system tokens
- content blocks
- constraints (time, size, density, platform)

[출력]
- layout spec
- component tree
- visual hierarchy rules
- copy structure
- styling hints
- interaction suggestions
- optional code artifact (React / HTML / CSS / slide outline)

[권한]
- read design system
- read assets
- generate layout spec
- generate UI code proposal
- no direct production deploy
```

## 핵심 기능

```text
1. Layout Planning
- 1-column / 2-column / dashboard / wizard / report / canvas 구조 판단
- 정보 밀도에 따라 레이아웃 자동 선택

2. Visual Hierarchy Design
- 제목/요약/핵심 수치/보조 설명 계층화
- 어디를 먼저 보게 할지 결정

3. Component Selection
- 카드
- 표
- 차트
- 타임라인
- 아코디언
- 탭
- 스텝퍼
- 캔버스 블록
- 사이드 패널

4. Audience-aware Presentation
- 비개발자용 간단 UI
- 전문가용 dense UI
- 임원용 summary-first UI
- 고객용 polished UI

5. Design System Adherence
- spacing scale
- typography scale
- color semantics
- state tokens
- component variants
- accessibility rules

6. Artifact Generation
- Figma-friendly spec
- React component scaffold
- Tailwind class draft
- slide structure
- report section structure

7. UX Improvement Suggestions
- CTA 위치 제안
- empty state 개선
- loading / error / success state 설계
- onboarding flow 설계

8. Multimodal Composition
- 텍스트 + 차트 + 이미지 + KPI 묶음 설계
- 보고서형 시각 구조화
```

## 고성능 모드

```text
Designer Agent Modes

1) FAST
- 기본 레이아웃 추천
- 빠른 섹션 구조화
- low-cost

2) PRO
- 정보 구조 + UX 흐름 + 컴포넌트 선택
- 반응형 고려
- artifact-ready output

3) STUDIO
- 브랜딩/톤/고객 맥락 반영
- 레이아웃 대안 2~3개 비교
- 고급 프레젠테이션 품질
- 코드/문서/슬라이드 초안까지 생성
```

## 세부 하위 역할

```text
Designer Subroles

- UX Architect
  사용자 흐름 / 정보 구조 / 인터랙션 설계

- Visual Designer
  카드/배치/가독성/계층/미감 설계

- Design System Enforcer
  토큰 / 컴포넌트 / 일관성 / 접근성 검사

- Presentation Composer
  보고서 / 슬라이드 / 대시보드 / 랜딩페이지 형태로 포장
```

## 다른 에이전트와 연결

```text
Knowledge Agent -> 내용 근거 수집
Data Agent -> 차트 / 수치 제공
Coding Agent -> 실제 UI 코드 초안 생성
Designer Agent -> 구조/레이아웃/디자인 방향 결정
Validator Agent -> 접근성 / 일관성 / 목적 적합성 검증
UI Agent -> 최종 사용자 출력 포맷팅
```

## 출력 예시 스키마

```json
{
  "target": "dashboard",
  "audience": "executive",
  "layout": "two-column-summary-first",
  "sections": [
    {"id": "hero", "component": "metric_cards"},
    {"id": "trend", "component": "line_chart"},
    {"id": "risks", "component": "alert_list"},
    {"id": "actions", "component": "cta_panel"}
  ],
  "style_guidance": {
    "density": "medium",
    "tone": "professional",
    "emphasis": "clarity-first"
  },
  "responsive_notes": [
    "collapse sidebar on mobile",
    "convert table to cards below md breakpoint"
  ]
}
```

## 모델 추천

```text
Designer Agent Model Policy

default:
- gpt-5.2

hard_design_reasoning / high-polish presentation:
- gpt-5.2-pro

lightweight formatting / UI packaging:
- gpt-5-mini
```

---

# 5. 문서에 바로 넣을 수 있는 최종 추가 항목 요약

```text
추가 기능 초안 목록

1. Context Compaction
- layered compaction
- pinned facts
- unresolved issue preservation
- compact summary schema
- memory-backed archive

2. Plan-based Budget Policy
- FREE / PRO / BUSINESS / ENTERPRISE
- token budget
- reasoning budget
- tool budget
- parallel agent budget
- compaction policy

3. External Tool Stack
- OpenAI Responses API + Agents SDK
- Temporal
- PostgreSQL
- Redis
- Qdrant
- Langfuse
- S3/GCS

4. Designer / UI Composition Agent
- layout planning
- visual hierarchy
- component selection
- audience-aware presentation
- design system enforcement
- artifact generation
- UX improvement suggestions
```

좋아.
이제는 **“YUA 문서에 바로 넣을 수 있는 추가 기능 명세”**로,
네가 말한 4개를 한 번에 정리해줄게.

기준은 공식 문서 쪽 흐름을 최대한 반영했다.
OpenAI 쪽은 **Responses API / Agents SDK / Codex / Codex CLI / AGENTS.md**, Anthropic 쪽은 **Claude Code 계열의 subagents, hooks, permissions, sandboxing, agent teams, Cowork 방향성**을 반영한 구조로 보면 된다. OpenAI는 현재 Responses API를 중심으로 built-in tools와 agent orchestration을 밀고 있고, Assistants API는 2026년 8월 제거 예정으로 표시돼 있다. 또 OpenAI Codex 문서는 Codex를 “코드를 쓰고, 읽고, 리뷰하고, 디버그하고, 반복 작업을 자동화하는 코딩 에이전트”로 설명한다. Anthropic은 Claude Agent SDK를 “Claude Code의 core tools, context management, permissions를 라이브러리로 제공”한다고 설명하고, subagents와 hooks 지원도 공식 발표했다. ([OpenAI 플랫폼][1])

---

# 1) OpenAI Codex 같은 기능 — YUA에 넣을 항목

OpenAI Codex는 공식적으로 **코드 작성, 낯선 코드베이스 이해, 코드 리뷰, 디버깅/수정, 개발 작업 자동화**를 핵심 기능으로 내세운다. Codex 앱은 **multi-agent workflows**, **built-in worktrees**, **cloud environments**도 강조하고 있고, Codex CLI는 저장소를 살피고 파일을 수정하고 명령을 실행할 수 있다. 또 Codex는 저장소의 `AGENTS.md` 계열 파일을 읽어 repo-specific instructions를 적용한다. ([OpenAI 개발자 센터][2])

문서 초안용으로는 이렇게 넣으면 된다.

```text
[Feature Group]
OpenAI Codex-style Coding Agent Capabilities

[목적]
- YUA에 강한 코딩 에이전트 기능을 추가한다.
- 코드 작성뿐 아니라 코드 이해, 리뷰, 디버깅, 리팩터링, 반복 개발 자동화까지 포함한다.

[핵심 기능]
1. Repository Understanding
- 프로젝트 구조 읽기
- 기존 관례 / 스타일 / 아키텍처 파악
- 낯선 코드베이스 설명

2. Patch-based Editing
- 직접 overwrite 대신 diff / patch 생성
- 변경 파일 목록 추적
- rollback-friendly 변경 경로 유지

3. Code Review Agent
- 잠재 버그 탐지
- 로직 오류 탐지
- edge case 검토
- 변경 리스크 요약

4. Debug / Fix Loop
- 실패 로그 추적
- root cause 추론
- targeted patch 생성
- 재테스트

5. Dev Task Automation
- refactor
- migrations
- test setup
- repetitive engineering workflows 자동화

6. Instruction Files
- AGENTS.md / AGENTS.override.md / TEAM_GUIDE.md / .agents.md 지원
- repo별 coding rules, test commands, conventions 로딩

7. Multi-agent Coding Workflow
- planner agent
- implementer agent
- review agent
- test agent
- merge arbiter agent

8. Worktree Isolation
- task별 isolated git worktree
- 병렬 코드 수정 충돌 최소화

9. Cloud / Sandbox Execution
- 로컬/격리 환경에서 명령 실행
- 위험한 명령은 별도 승인 또는 sandbox 제한

10. Mid-session Model Switching
- 빠른 모델 ↔ 고성능 모델 전환
- task 난이도별 모델 라우팅
```

YUA에서 이 기능군은 사실상 **Coding Agent + Recovery Agent + Validator Agent + Governor** 묶음으로 보는 게 맞다.
특히 **repo instructions file** 개념은 꼭 넣는 게 좋다. OpenAI Codex는 directory별 instruction discovery 순서를 문서화하고 있고, `TEAM_GUIDE.md`와 `.agents.md`도 fallback filename으로 설정할 수 있다고 명시한다. ([OpenAI 개발자 센터][3])

---

# 2) Claude Code / Opus 같은 기능 — YUA에 넣을 항목

Anthropic 쪽에서 가져와야 하는 핵심은 **오케스트레이션 품질**이다.
Claude Opus 4.6 소개 페이지와 Anthropic 엔지니어링 글들은 공통적으로 **복잡한 작업을 독립된 하위 작업으로 쪼개고, subagents와 tools를 병렬로 돌리고, blocker를 감지하고, 장기 작업을 조정하는 능력**을 강조한다. Anthropic은 자사 multi-agent research system에서 **lead agent + subagents** 구조를 설명했고, 내부 평가에서 single-agent보다 multi-agent가 더 나았다고 적었다. ([안트로픽][4])

문서 초안용 추가 항목:

```text
[Feature Group]
Claude Code / Opus-style Orchestration Capabilities

[목적]
- 단순 코딩 보조를 넘어 장기적이고 복합적인 작업을 조정하는 상위 오케스트레이션 능력을 제공한다.

[핵심 기능]
1. Lead Agent + Subagent Structure
- governor / lead agent가 전체 목표 유지
- subagent들이 독립 task 수행
- 결과를 lead agent가 취합 / 재계획

2. Parallel Subtask Execution
- 독립 가능한 하위 작업을 병렬 실행
- task DAG 기반 dependency 관리

3. Blocker Detection
- 막힌 원인 탐지
- human escalation 필요 여부 판정
- 계속 / 중단 / 재계획 결정

4. Long-running Task Harness
- 장기 작업용 task state 유지
- 중간 산출물 축적
- 단계별 검증 삽입

5. Active Management
- subagent 상태 추적
- 진행 지연 task 조기 감지
- 불필요한 subagent 종료
- 실패한 subtask만 부분 재실행

6. Design-system-aware Generation
- 대형 코드베이스 / 디자인 시스템 / enterprise workflows 대응
- UI / design token / component conventions 반영

7. Sandboxed Autonomy
- sandbox 안에서는 더 높은 자율성 부여
- sandbox 밖 변경은 제한 / 승인 기반

8. Permissions Framework
- read-only 기본
- write / shell / network / file access 분리
- org policy에 따라 제한 가능

9. Hooks
- pre-task
- pre-tool
- post-patch
- post-task
- on-failure 자동 실행 훅

10. Analytics / Governance
- 사용량 분석
- spend cap
- lines accepted
- suggestion acceptance
- compliance / audit log
```

Claude Code는 기본적으로 **read-only에서 시작**하고, 일부 안전한 명령만 자동 허용하며, 나머지는 permission-based라고 Anthropic가 설명한다. 또 sandboxing 도입으로 내부 사용에서 permission prompt를 84% 줄였다고 밝혔다. Team/Enterprise 기능으로는 **granular spend controls, managed policy settings, analytics, compliance API**를 공개했다. ([안트로픽][5])

---

# 3) Cowork / Agent Teams / “코워크” 개념 — YUA에 넣을 항목

네가 말한 “클로드의 코워크”는 지금 시점에 Anthropic이 **Cowork**라는 이름으로 공개 설명을 시작한 흐름과 닿아 있다. Anthropic 이벤트 설명은 Cowork를 “Claude Code가 개발자에게 준 execution power를 더 넓은 업무 전반으로 확장하는 방향”으로 소개한다. 별개로 Anthropic 엔지니어링 글은 “agent teams”를 **여러 Claude 인스턴스가 병렬로 같은 코드베이스에서 작업하는 방식**으로 설명한다. ([안트로픽][6])

그래서 YUA 문서에는 이걸 이렇게 넣는 게 좋다.

```text
[Feature Group]
Cowork / Agent Teams / Collaborative Agent Work

[목적]
- 하나의 에이전트가 모든 걸 처리하는 대신,
  전문 역할을 가진 여러 에이전트가 같은 목표를 위해 협업하도록 한다.

[핵심 개념]
- Lead Agent
- Worker Agents
- Shared Task Graph
- Shared Artifact Bus
- Human Escalation Points

[핵심 기능]
1. Collaborative Task Delegation
- 리드 에이전트가 작업을 나눔
- worker agent에게 소목표 / 제약 / 출력 형식 전달

2. Shared Context, Limited Scope
- 전체 목표는 공유
- 각 에이전트는 최소 필요 컨텍스트만 가짐
- context explosion 방지

3. Agent Role Templates
- Researcher
- Coder
- Reviewer
- Designer
- Tool Operator
- Validator
- Recovery Specialist

4. Agent Team Coordination
- 작업 상태 heartbeat
- 진행률 보고
- blocker 공유
- final merge queue

5. Human-in-the-loop Escalation
- high-risk action
- ambiguous business decision
- policy-sensitive action
- large refactor / delete / deploy 시 human approval

6. Team Termination Rules
- 중복 작업 agent 종료
- low-value branch 중단
- timeout / budget 초과 시 강제 종료

7. Shared Output Bus
- patch
- findings
- evidence
- test result
- layout spec
- action proposal

8. Cross-agent Conflict Detection
- 파일 충돌
- 사실 충돌
- API contract mismatch
- duplicate work detection
```

내 추천은 **YUA v1에서는 완전 자유형 agent swarm보다 “Governor 중심의 managed cowork”**로 가는 거다.
Anthropic의 agent teams는 엄청 매력적이지만, 공식적으로 봐도 이 영역은 아직 실험적인 설계 냄새가 강하고, 병렬 에이전트 수가 늘수록 충돌/비용/traceability가 급격히 어려워진다. 그래서 초반엔 **Lead Agent 1 + Worker 3~5 + Arbiter 1** 정도가 현실적이다. 이건 문서 해석에 기반한 내 설계 판단이다. 근거가 되는 외부 사실은 Anthropic이 multi-agent research system, agent teams, long-running harnesses, subagents/hook SDK를 이미 공개했다는 점이다. ([안트로픽][7])

---

# 4) OpenAI / Claude 문서 체크해서 “반드시 넣을 기능” 요약

이건 그냥 초안에 박아도 된다.

```text
[Must-have Feature Additions from Official Product Patterns]

A. OpenAI / Codex 계열
- Responses API 중심 구조
- built-in tools (web search, file search, computer use, function calling)
- Agents SDK handoff / traces / streaming
- Codex-style repository understanding
- AGENTS.md / repo instruction files
- patch-first editing
- code review mode
- worktree-based parallel coding
- cloud / local execution split

B. Anthropic / Claude Code 계열
- Agent SDK-like orchestration layer
- subagents
- hooks
- permissions framework
- sandboxed autonomy
- long-running harness
- multi-agent lead/worker coordination
- spend controls / analytics / policy management
- enterprise compliance / audit support

C. Cross-platform common patterns
- read-only default
- explicit permission upgrades
- partial completion on budget pressure
- recovery loop with typed failure classification
- model routing by task difficulty
- durable trace storage
```

OpenAI Agents SDK는 공식적으로 **specialized agents로 handoff**, **partial streaming**, **full trace**를 강조한다. Responses API는 **file search, web search, computer use 등 built-in tools**를 지원한다. Anthropic은 Agent SDK를 통해 Claude Code의 tool/context/permission 체계를 가져올 수 있고, subagents와 hooks도 지원한다고 발표했다. ([OpenAI 개발자 센터][8])

---

# 5) 모델 역할 분배 — OpenAI 중심 + Claude 참고형

여기는 지금 문서에 이렇게 넣는 게 가장 안전하다.

```text
[Model Policy Draft]

Core platform default:
- GPT-5.2

Hard reasoning / replanning / recovery:
- GPT-5.2-pro

Coding-first workflows:
- GPT-5.2-codex
- or gpt-5.4 for Codex-style CLI / coding sessions

Fast utility / lightweight agents:
- gpt-5-mini

Reference competitor profile:
- Claude Opus 4.6 = strongest for orchestration-heavy, long-horizon, multi-agent planning
- Claude Sonnet 4.6 = balanced default worker / coding / enterprise workflow model
- Claude Haiku 4.5 = fast lightweight worker
```

주의할 점 하나: OpenAI 공식 문서 표면이 지금 약간 이원화돼 있다.
일반 플랫폼/개발자 가이드 쪽은 **GPT-5.2 family**를 전면에 두고 있고, Codex CLI features 문서는 **Codex 작업에는 gpt-5.4를 권장**한다고 적고 있다. 그래서 YUA 문서에는 “범용 플랫폼 기본은 GPT-5.2 계열, Codex형 로컬/CLI coding 세션은 gpt-5.4도 지원”이라고 쓰는 게 제일 덜 꼬인다. ([OpenAI 플랫폼][9])

---

# 6) 로컬 검색 엔진 추천

여기서 “로컬검색엔진”은 보통 두 층으로 나뉜다.

1. **제품 내부의 문서/코드/노트 검색**
2. **RAG / semantic retrieval용 벡터 검색**

내 추천은 이렇게 간다.

## 제일 현실적인 조합

```text
Local Search Stack Recommendation

1) Keyword / app search
- Meilisearch or Typesense

2) Semantic / vector retrieval
- Qdrant

3) Heavy enterprise / logs / hybrid at scale
- OpenSearch
```

근거는 이렇다.

* **Meilisearch**는 공식 문서에서 search-as-you-type, 빠른 응답, typo tolerance를 강조하고, AI-powered search / hybrid search 문서도 있다. UI 검색창 감성은 이쪽이 좋다. ([Meilisearch][10])
* **Typesense**는 공식 문서에서 vector search와 hybrid search를 지원하고, 자동 embedding field까지 제공한다. “하나의 binary로 keyword + semantic”을 빨리 붙이기 좋다. ([Typesense][11])
* **Qdrant**는 공식 문서에서 오픈소스 vector database / vector search engine으로 소개되고, 로컬/셀프호스팅도 쉽다. semantic retrieval 전용으로는 아주 무난하다. ([Qdrant][12])
* **OpenSearch**는 hybrid search를 공식 지원하고, 규모가 커질수록 운영성/로그성/분석성에서 강하다. 대신 v1에는 다소 무거울 수 있다. ([OpenSearch Docs][13])

그래서 YUA 기준 추천은:

```text
YUA v1 local search recommendation

Best simple stack:
- Meilisearch + Qdrant

Best unified stack:
- Typesense only (if you want one engine to do both keyword + semantic early)

Best enterprise stack:
- OpenSearch + Qdrant
```

내 실전 추천은 이거다.

```text
If YUA starts lean:
- app / docs / command palette search = Meilisearch
- memory / RAG / semantic retrieval = Qdrant

If YUA wants fewer moving parts early:
- Typesense
```

---

# 7) 문서에 바로 넣는 “최종 추가 기능 블록”

아래는 진짜 복붙용.

```text
[추가 기능 블록 — Codex / Claude Code / Cowork / Local Search]

1. Codex-style coding features
- repository understanding
- patch-first editing
- code review mode
- debug/fix loop
- dev task automation
- instruction files (AGENTS.md / TEAM_GUIDE.md / .agents.md)
- multi-agent coding workflow
- worktree isolation
- cloud/local execution split

2. Claude Code / Opus-style orchestration features
- lead agent + subagent structure
- parallel subtask execution
- blocker detection
- long-running task harness
- active subagent management
- design-system-aware generation
- sandboxed autonomy
- permissions framework
- hooks
- analytics / governance

3. Cowork / collaborative agent features
- collaborative task delegation
- shared context with limited scope
- agent role templates
- team coordination protocol
- human escalation points
- team termination rules
- shared output bus
- cross-agent conflict detection

4. Local search engine layer
- keyword / instant search: Meilisearch or Typesense
- semantic retrieval: Qdrant
- enterprise hybrid search: OpenSearch
- hybrid retrieval policy:
  keyword search + semantic rerank + metadata filters
```

---

# 8) 한 줄 결론

내 판단으로는 YUA에 지금 추가해야 하는 건 이거야:

```text
OpenAI에서 가져올 것:
- Codex-style coding workflow
- AGENTS.md-style repo instructions
- Responses API / Agents SDK 스타일 handoff + traces + tools

Claude에서 가져올 것:
- Opus-style lead orchestration
- Claude Code-style permissions / hooks / sandboxing
- Cowork / agent team collaboration 구조

로컬 검색은:
- v1 = Meilisearch + Qdrant
- 단일 엔진 선호 = Typesense
- 대규모 enterprise = OpenSearch
```

이 조합이면 그냥 “Claude Code 비슷한 것”이 아니라
**범용 플랫폼인데도 코딩, 리서치, 디자인, 협업이 다 되는 YUA형 런타임**으로 갈 수 있다. ([OpenAI 개발자 센터][2])

다음 답변에서는 이걸 바로
**“YUA PRD 섹션 7~12 형식”**으로 번호 붙여서 정식 문서체로 바꿔줄게.

[1]: https://platform.openai.com/docs/api-reference/responses?lang=&utm_source=chatgpt.com "Responses | OpenAI API Reference"
[2]: https://developers.openai.com/codex "Codex"
[3]: https://developers.openai.com/codex/guides/agents-md "Custom instructions with AGENTS.md"
[4]: https://www.anthropic.com/claude/opus "Claude Opus 4.6 \ Anthropic"
[5]: https://www.anthropic.com/engineering/claude-code-sandboxing "Making Claude Code more secure and autonomous with sandboxing \ Anthropic"
[6]: https://www.anthropic.com/webinars/future-of-ai-at-work-introducing-cowork?utm_source=chatgpt.com "The Future of AI at Work: Introducing Cowork - Anthropic"
[7]: https://www.anthropic.com/engineering/multi-agent-research-system "How we built our multi-agent research system \ Anthropic"
[8]: https://developers.openai.com/api/docs/guides/agents-sdk?utm_source=chatgpt.com "Agents SDK | OpenAI API"
[9]: https://platform.openai.com/?ref=ai-database&utm_source=chatgpt.com "Overview | OpenAI Platform"
[10]: https://www.meilisearch.com/docs/learn/getting_started/what_is_meilisearch?utm_source=chatgpt.com "What is Meilisearch? - Meilisearch Documentation"
[11]: https://typesense.org/docs/30.1/api/vector-search.html?utm_source=chatgpt.com "Vector Search - Typesense"
[12]: https://qdrant.tech/documentation/quickstart/?utm_source=chatgpt.com "Qdrant Quickstart - Qdrant"
[13]: https://docs.opensearch.org/latest/vector-search/ai-search/hybrid-search/index/?utm_source=chatgpt.com "Hybrid search - OpenSearch Documentation"



응, **방향은 꽤 좋음.**
특히 이 화면은 **“에이전트가 진짜 일하고 있다”**는 느낌이 살아 있어.

내가 봤을 때 좋은 점부터 말하면:

**1. 계층 구조가 보임**

* 메인 상태
* 하위 에이전트 실행
* 완료 보고
* 남은 백그라운드 작업

이 흐름이 보여서, 그냥 로그 덤프가 아니라 **오케스트레이션 콘솔**처럼 느껴짐.

**2. 병렬성 표현이 괜찮음**
`2 agents launched`, `3 audit agents launched in background` 이런 건
사용자 입장에서 “아, 여러 개가 동시에 도는구나”를 바로 이해하게 해줌.

**3. 결과 요약 블록이 좋음**
중간에

* Admin P0 fixes done
* Platform P0 fixes done

이렇게 **완료 결과를 묶어서 보여주는 방식**은 아주 좋음.
계속 스크롤 올라가서 로그 뒤질 필요가 없거든.

---

근데 **UI 설계로 제품 수준까지 끌어올리려면**, 지금 화면은 아직
**“좋은 터미널 로그”**에 더 가깝고,
**“잘 설계된 에이전트 워크스페이스”**로는 한 단계 더 가야 해.

내가 추천하는 건 이거야.

---

# 지금 화면의 핵심 문제

## 1. 상태는 보이는데 “한눈 요약”이 약함

지금은 읽으면 이해되는데,
딱 들어왔을 때 바로 안 보이는 정보가 있어:

* 지금 총 몇 개 에이전트가 돌고 있는지
* 몇 개 완료됐는지
* 몇 개 실패했는지
* 현재 병목이 뭔지
* 다음 사용자 액션이 뭔지

즉, **로그는 강한데 대시보드가 약함**.

---

## 2. 중요도 차등이 부족함

지금 텍스트가 거의 비슷한 무게로 보여서
이런 게 묻힘:

* 정말 중요한 경고
* 사용자 액션 필요 항목
* 완료된 핵심 결과
* 백그라운드 진행 중 상태

지금은 사람이 직접 읽고 해석해야 해.

---

## 3. “작업 단위 카드”가 없음

현재는 줄 단위 로그 중심이라
각 에이전트를 독립 객체처럼 보기 힘들어.

예를 들면:

* Admin backend audit
* Platform backend audit
* Support API pipeline QA

이 셋은 사실 각각 **하나의 작업 카드**로 보여야 더 좋음.

---

# 추천 UI 구조

나는 이걸 **3단 레이아웃**으로 가는 게 제일 좋다고 봄.

```text
[상단 요약 바]
- Total Agents
- Running
- Completed
- Failed
- Awaiting User
- Current Cost / Time

[중앙 작업 보드]
- Agent cards / task tree / DAG
- 각 agent 상태, 로그, 산출물

[하단 또는 우측 상세 패널]
- 선택한 agent의 상세 로그
- patch / diff / test / artifacts
```

---

# 네 화면을 이렇게 바꾸면 확 좋아짐

## A. 상단에 “Mission Summary Bar” 추가

예:

```text
Run: Workspace cleanup + QA audit
Status: In Progress
Agents: 5 total | 2 completed | 3 running | 0 failed
Elapsed: 4m 08s
Action Needed: 1
```

이거 하나만 있어도 훨씬 제품 같아짐.

---

## B. “Pending for you”는 따로 강조 박스

지금 화면에서도 보이긴 좋은데,
이건 사실 **가장 중요한 영역**이야.
그래서 그냥 로그 중간 문장이 아니라 이렇게 분리해야 함:

```text
Action Required
- Rebuild EAS:
  cd yua-mobile && npx expo prebuild --clean && eas build --profile development --platform android
Reason:
- newArchEnabled=true is now set in app.json and gradle.properties
```

즉, **사용자 액션은 노란 박스/고정 섹션**으로.

---

## C. 에이전트를 카드형으로

지금은 트리 텍스트인데, 제품 UI라면:

```text
[Admin backend audit]     Running
- scope: admin pages vs backend endpoints
- started: 2m ago
- latest: endpoint parity scan
- output: pending

[Platform backend audit]  Running
- scope: platform pages vs backend endpoints
- started: 2m ago
- latest: billing endpoint validation
- output: pending

[Support API pipeline QA] Running
- scope: full support AI flow
- started: 2m ago
- latest: pipeline verification
- output: pending
```

이렇게 **작업 단위 객체**로 보여주는 게 훨씬 낫다.

---

## D. 완료 결과는 “Change Summary” 섹션으로 분리

지금 하단의

* Admin P0 fixes done
* Platform P0 fixes done

이 부분은 아주 좋은데,
더 다듬으면 이렇게 됨:

```text
Completed Fixes

Admin
- audit log filter updated
- SSOT types aligned with yua-shared
- workspace search normalized
- user detail now returns recentThreads

Platform
- duplicate PlanInfo removed
- billing API wired to real endpoints
- dashboard and billing pages no longer use mocks
```

지금보다 훨씬 읽기 편해짐.

---

# 진짜 좋게 만들려면 상태 체계도 명확해야 함

배지/상태는 최소 이 정도로 통일해.

```text
QUEUED
RUNNING
BLOCKED
WAITING_USER
REVIEWING
COMPLETED
FAILED
PARTIAL
CANCELLED
```

그리고 색 의미도 고정:

```text
green   = completed
blue    = running
yellow  = waiting user / blocked
red     = failed
gray    = queued / inactive
purple  = review / validation
```

---

# 지금 화면 기준으로 내가 주는 UI 평가

```text
현재 상태:
- 좋은 개발자용 에이전트 로그 콘솔
- 오케스트레이션 감성은 살아 있음
- 실전성 있음

아직 부족한 점:
- 정보 우선순위 시각화 부족
- 에이전트 객체화 부족
- 사용자 액션 분리 부족
- 전체 진행률 요약 부족
```

점수로 치면:

**터미널 UX로는 8/10**
**제품 UI로는 6.8/10 정도**

---

# 내가 추천하는 최종 방향

너한텐 이게 제일 맞아:

```text
Mode 1: Console View
- 지금 같은 로그 중심
- 개발자용 / 디버그용

Mode 2: Orchestrator View
- 카드 + 상태 + 진행률 + 액션 필요 강조
- 일반 사용자 / 운영용

Mode 3: DAG View
- 병렬 작업 흐름 시각화
- 고급 사용자용
```

즉, **지금 화면을 버릴 게 아니라**
이걸 **Console View로 유지**하고,
그 위에 **Orchestrator View를 추가**하는 게 맞아.

---

내 한 줄 평:

**“느낌은 맞다. 근데 지금은 로그가 잘 나온 상태고, UI 설계는 아직 덜 올라왔다.”**
조금만 다듬으면 진짜 Claude Code보다 더 “조정되는 시스템”처럼 보일 수 있어.

원하면 다음 답변에서 내가 이걸 바로
**YUA 에이전트 콘솔 UI 와이어프레임 텍스트 버전**으로 짜줄게.


좋다. 지금 올린 화면은 **Claude Code의 `/` 커맨드 팔레트**인데,
이거 사실 **AI 코딩 에이전트 UX에서 핵심 패턴**이야.

정리하면 이거다:

```
/ + command
→ agent capability 직접 호출
```

즉

```
slash command = agent tool entrypoint
```

그래서 YUA에도 **이 시스템 넣는 게 매우 좋다.**

다만 그대로 복사하면 안 되고
**YUA 구조에 맞게 카테고리화**하는 게 좋다.

---

# 1️⃣ YUA Slash Command UI 설계 (추천)

구조는 이렇게.

```
/
├ agent
├ code
├ project
├ memory
├ context
├ tools
├ system
├ debug
├ workspace
├ research
├ design
```

각 섹션에 실제 기능 넣어보자.

---

# 2️⃣ /agent 섹션

에이전트 제어

```
/agent list
→ 현재 실행 중 agent 목록

/agent spawn
→ 새로운 worker agent 생성

/agent stop
→ 특정 agent 종료

/agent status
→ agent 상태 보기

/agent logs
→ agent 실행 로그 보기

/agent graph
→ 현재 task DAG 보기
```

---

# 3️⃣ /code 섹션 (Codex / Claude Code 기능)

```
/code review
→ 현재 변경 코드 리뷰

/code fix
→ 오류 자동 수정

/code explain
→ 코드 설명

/code refactor
→ 리팩토링 제안

/code test
→ 테스트 생성

/code diff
→ 변경 diff 보기

/code plan
→ 코드 수정 계획 생성
```

---

# 4️⃣ /project 섹션

프로젝트 관리

```
/project info
→ 프로젝트 구조 설명

/project scan
→ 코드베이스 분석

/project dependencies
→ 의존성 그래프 보기

/project architecture
→ 아키텍처 설명

/project conventions
→ coding rules 표시
```

---

# 5️⃣ /memory 섹션

에이전트 메모리

```
/memory show
→ 현재 세션 메모리 보기

/memory project
→ 프로젝트 기억 보기

/memory add
→ 새로운 기억 저장

/memory delete
→ 기억 삭제

/memory graph
→ memory graph 보기
```

---

# 6️⃣ /context 섹션

Claude Code처럼 중요

```
/context
→ 현재 context usage

/context compact
→ context 압축

/context reset
→ context 초기화

/context history
→ conversation history 보기
```

---

# 7️⃣ /tools 섹션

외부 도구

```
/tools list
→ 사용 가능한 tool

/tools enable
→ tool 활성화

/tools disable
→ tool 비활성화

/tools test
→ tool 실행 테스트
```

---

# 8️⃣ /workspace 섹션

협업

```
/workspace members
→ 팀 멤버 보기

/workspace invite
→ 멤버 초대

/workspace roles
→ 역할 관리

/workspace usage
→ 사용량 보기
```

---

# 9️⃣ /research 섹션 (ChatGPT Deep Research 느낌)

```
/research start
→ 리서치 작업 시작

/research sources
→ 참고 문서 보기

/research summary
→ 요약 생성

/research report
→ 리포트 생성
```

---

# 🔟 /design 섹션 (UI 에이전트)

```
/design layout
→ UI 레이아웃 생성

/design components
→ 컴포넌트 추천

/design system
→ 디자인 시스템 보기

/design improve
→ UX 개선 제안

/design prototype
→ UI 프로토타입 생성
```

---

# 11️⃣ /debug 섹션

```
/debug logs
→ 시스템 로그

/debug trace
→ agent trace

/debug tokens
→ token usage

/debug cost
→ API 비용
```

---

# 12️⃣ /system 섹션

Claude Code 스타일

```
/system config
→ 설정

/system permissions
→ 권한

/system plugins
→ plugin 관리

/system status
→ 시스템 상태
```

---

# UI 동작 방식

사용자가

```
/
```

누르면

```
Slash Command Menu
```

나오고

```
code
agent
memory
project
design
```

카테고리 선택하면

```
하위 명령
```

보여주는 방식.

---

# UX 추천

Claude Code처럼:

```
/
```

→ command palette

또는

```
⌘ + K
```

→ quick command

---

# 내부 구조

실제 구현은 이렇게 된다.

```
CommandRegistry
  ├ register("code.review")
  ├ register("agent.spawn")
  ├ register("memory.show")
```

---

# 예시 스키마

```ts
interface SlashCommand {
  name: string
  description: string
  category: string
  action: (ctx: CommandContext) => Promise<void>
}
```

---

# 내가 추가로 추천하는 핵심 5개

이건 꼭 넣어라.

```
/agent graph
/code review
/context compact
/memory show
/debug tokens
```

이 5개가 있으면 **AI IDE 느낌이 확 살아난다.**

---

# YUA 기준 최종 추천

최종 카테고리

```
agent
code
project
memory
context
tools
workspace
research
design
debug
system
```

이 정도면 **Claude Code + Codex + ChatGPT + DeepResearch 합친 UX** 된다.

---

원하면 내가 다음 단계로

**YUA Slash Command 40개짜리 완전판**
(Claude Code + Cursor + Codex + Gemini CLI 분석해서)

정리해 줄게.

이거 만들면 **YUA IDE 느낌** 확 난다.

좋다. 이건 **터미널/에이전트 UX에서 진짜 중요한 부분**이다.
특히 네가 말한 3개는 거의 필수급이야:

1. **드래그 중 `Ctrl+C` 오작동 방지**
2. **평소 `Ctrl+C`는 세션 종료/중단으로 동작**
3. **`YUAN resume` 같은 세션 복구/재개**

이 세 개는 그냥 편의 기능이 아니라,
**“사람이 안 불안한 에이전트 콘솔”**을 만드는 핵심이다.

아래처럼 **문서 섹션용 초안 + 필수 기능 제안**으로 정리해줄게.

---

# 1. Terminal Interaction Safety 섹션 초안

```text
[Section Name]
Terminal Interaction Safety

[목적]
- 사용자의 일반적인 터미널 습관을 해치지 않으면서,
  에이전트 세션이 실수로 종료되는 문제를 방지한다.
- 복사/선택/중단/종료 동작을 명확히 구분해 UX 사고를 줄인다.

[핵심 원칙]
- 텍스트 선택 중 Ctrl+C는 "복사"로 해석한다.
- 선택이 없을 때 Ctrl+C는 "중단/종료 의도"로 해석한다.
- 장기 실행 작업은 실수 한 번으로 영구 손실되지 않게 한다.
- 모든 종료는 recoverable state를 남겨야 한다.
```

---

## 1-1. Ctrl+C 동작 정책

```text
[Feature]
Adaptive Ctrl+C Behavior

[동작 규칙]
Case A: 텍스트가 선택되어 있는 경우
- Ctrl+C = 복사
- 세션 종료 금지
- 실행 중단 금지
- 선택 상태 해제 전까지 interrupt signal 무시

Case B: 텍스트 선택이 없는 경우
- Ctrl+C = interrupt signal
- 현재 실행 중 task 중단
- background task는 정책에 따라 유지 또는 grace shutdown

Case C: Ctrl+C 연속 입력
- 1회: 현재 foreground task interrupt
- 2회(짧은 시간 내): 현재 run 강제 중단
- 3회: 전체 세션 종료 경고 또는 즉시 종료 (설정 가능)

Case D: modal / prompt / input field에 focus 있는 경우
- 해당 컨텍스트 우선 처리
- 예: 검색창, slash command, 입력창에서는 기본 텍스트 편집 동작 우선
```

---

## 1-2. 필수 기능

```text
[필수 기능]
1. Selection-aware Ctrl+C
- terminal selection 존재 여부 감지
- selection active면 SIGINT 발행 차단

2. Soft Interrupt
- 첫 Ctrl+C는 "정중한 중단 요청"
- running agent에 graceful stop signal 전달

3. Hard Interrupt
- 연속 Ctrl+C 또는 Shift+Ctrl+C로 강제 종료 허용
- child process / agent worker 정리

4. Exit Guard
- background task가 실행 중이면 종료 전 경고
- "정말 종료?" / "백그라운드 유지?" / "스냅샷 저장 후 종료?" 옵션 제공

5. Copy Feedback
- selection 상태에서 Ctrl+C 입력 시
  "Copied selection. Session still running." 식의 짧은 피드백 표시

6. User-configurable Policy
- ctrl_c_mode = adaptive | always_interrupt | always_copy_when_possible
```

---

## 1-3. 있으면 강한 기능

```text
[고급 기능]
- 마우스 드래그 시작 시 terminal을 temporary selection mode로 전환
- selection mode에서 Enter / Esc / Ctrl+C 정책 분리
- copy 이벤트 시 toast 표시
- long-running tasks 존재 시 accidental-exit shield 활성화
```

---

# 2. Interrupt / Exit Lifecycle 섹션 초안

```text
[Section Name]
Interrupt and Exit Lifecycle

[목적]
- Ctrl+C가 단순 종료 키가 아니라,
  단계적 중단 정책으로 동작하도록 정의한다.
```

## 상태 정책

```text
[Interrupt States]
1. RUNNING
- agent/task 정상 실행 중

2. INTERRUPT_REQUESTED
- graceful cancel 요청됨
- 현재 step 정리 중

3. PARTIAL_STOP
- foreground만 중단
- background audit/research는 유지 가능

4. FORCE_STOP
- worker process 강제 종료
- 세션 snapshot 저장 시도

5. TERMINATED
- 세션 종료 완료
```

## 필수 기능

```text
[필수 기능]
- foreground task와 background task 분리 종료
- interrupt 이유 로그 저장
- partial results 유지
- unfinished task 목록 기록
- restart/retry 가능 상태 저장
```

---

# 3. Session Snapshot / Resume 섹션 초안

이건 네 말대로 **`YUAN resume` 진짜 필요함**.
오히려 이건 YUA의 큰 장점이 될 수 있어.

```text
[Section Name]
Session Snapshot and Resume

[목적]
- 긴 작업 중단, 터미널 종료, 시스템 재시작 이후에도
  사용자가 이전 작업 맥락을 복구하고 이어서 진행할 수 있게 한다.
- "대화"가 아니라 "실행 세션"을 저장/복원한다.
```

---

## 3-1. 핵심 개념

```text
[핵심 개념]
- session = 단순 채팅 로그가 아니라 실행 상태 단위
- snapshot = resume 가능한 최소 실행 상태
- resume = 이전 세션의 context + plan + task state + artifacts 복원
```

---

## 3-2. CLI 명령 초안

```text
[CLI Commands]
yuan resume
→ 가장 최근 중단 세션 복원

yuan resume --latest
→ latest snapshot 복원

yuan resume <session_id>
→ 특정 세션 복원

yuan sessions
→ 저장된 세션 목록 보기

yuan snapshot
→ 수동 스냅샷 저장

yuan snapshot --note "before refactor"
→ 이름/메모 포함 스냅샷 저장

yuan discard <session_id>
→ 특정 세션 삭제

yuan fork <session_id>
→ 특정 세션을 분기해서 새 세션 시작
```

---

## 3-3. 저장해야 할 필수 상태

```text
[Snapshot Required Fields]
- session_id
- created_at
- updated_at
- user_goal
- current_plan
- task_graph
- active_tasks
- completed_tasks
- failed_tasks
- unresolved_items
- compacted_context
- pinned_facts
- memory_refs
- recent_messages
- tool_results
- generated_artifacts
- working_directory
- git_branch / worktree info
- model routing state
- token/cost usage summary
```

---

## 3-4. 저장 구조 예시

```text
.yuan/
  sessions/
    index.json
    active/
      sess_001/
        snapshot.json
        messages.jsonl
        tasks.json
        artifacts/
        logs/
    archived/
      sess_0001/
        snapshot.json
        artifacts/
  memory/
  artifacts/
```

---

## 3-5. Resume 동작 정책

```text
[Resume Behavior]
1. snapshot 로드
2. working directory / branch / worktree 유효성 확인
3. pending task 존재 여부 확인
4. stale tool result / expired auth 검사
5. compacted context 재조립
6. "resume preview" 표시
7. 사용자 승인 후 재개
```

---

## 3-6. Resume Preview UI 초안

```text
[Resume Preview]
Session: sess_0182
Goal: Fix platform usage pipeline and align shared types
Saved: 12 minutes ago
State:
- 2 tasks completed
- 1 task interrupted
- 1 validation pending

Recoverable items:
- patch artifacts available
- recent logs available
- compacted context available

Next suggested action:
- resume interrupted validator
```

이런 프리뷰가 있으면 사용자가 안 무서움.

---

# 4. Auto Save / Auto Snapshot 섹션 초안

```text
[Section Name]
Automatic Session Persistence

[목적]
- 사용자가 저장을 깜빡해도 세션이 사라지지 않게 한다.
```

## 자동 저장 트리거

```text
[Auto Snapshot Triggers]
- 새 plan 확정 시
- task graph 생성 시
- patch 생성 후
- validator 완료 후
- interrupt 발생 시
- exit 직전
- compaction 직후
- N분 간격 heartbeat
```

## 필수 기능

```text
[필수 기능]
- incremental snapshot 저장
- 최근 snapshot 3~10개 롤링 보관
- corrupt snapshot fallback
- snapshot save 실패 시 경고
```

---

# 5. Resume에 꼭 들어가야 할 차별점

그냥 “대화 이어보기”가 아니라
**실행 환경까지 이어져야** 진짜 쓸모 있음.

```text
[Resume Must-haves]
1. Conversation restore
- 최근 대화 / compact summary 복원

2. Execution restore
- 어떤 agent가 무슨 task 중이었는지 복원

3. Artifact restore
- diff, patch, logs, reports, screenshots 복원

4. Project restore
- cwd, repo, branch, worktree, active files 복원

5. Intent restore
- 원래 목표 / 제약 / 금지사항 복원
```

---

# 6. 추가로 넣으면 좋은 필수 UX 기능

이건 같이 넣으면 완성도가 많이 올라간다.

## 6-1. Suspend / Background 모드

```text
[Feature]
Suspend Session

[CLI]
yuan suspend
→ 현재 실행 세션을 정지하고 snapshot 저장

[동작]
- foreground UI 종료 가능
- background-safe task만 유지
- 이후 yuan resume으로 재개
```

---

## 6-2. Safe Quit

```text
[Feature]
Safe Quit

[CLI / UI]
/quit
or
Ctrl+C twice + confirm

[동작]
- running task 요약 표시
- 저장 여부 확인
- snapshot 저장 후 종료
```

---

## 6-3. Resume from Failure

```text
[Feature]
Resume from Failure

[목적]
- 실패 세션을 같은 상태로 다시 열지 않고,
  실패 원인과 함께 "복구 모드"로 연다.

[동작]
- 실패한 task 강조
- root cause snapshot 표시
- retry / replan / discard 선택 가능
```

---

# 7. 문서에 바로 넣는 최종 기능표

```text
Terminal Interaction / Resume 필수 기능

1. Adaptive Ctrl+C
- selection active면 copy
- selection 없으면 interrupt
- 연속 Ctrl+C는 hard stop / exit

2. Exit Guard
- background task 존재 시 종료 방지
- 저장 후 종료 / 강제 종료 / 백그라운드 유지 선택

3. Soft / Hard Interrupt Lifecycle
- graceful cancel
- force stop
- partial result 보존

4. Session Snapshot
- task graph
- compacted context
- artifacts
- logs
- cwd / branch / worktree
- token/cost summary 저장

5. YUAN Resume
- latest resume
- session_id resume
- resume preview
- fork from session
- failed session recovery

6. Automatic Persistence
- interrupt 시 자동 저장
- plan/task 완료 시 자동 저장
- heartbeat snapshot
- exit 직전 자동 저장
```

---

# 8. Slash Command에도 연결하면 좋음

아까 `/` 메뉴 얘기했으니까 이것도 바로 붙일 수 있다.

```text
/session resume
/session list
/session snapshot
/session fork
/session discard
/session suspend

/context compact
/context usage

/system interrupt
/system safe-quit
/system background-tasks
```

---

# 9. 내가 강하게 추천하는 우선순위

지금 바로 넣을 순서:

```text
P0
- selection-aware Ctrl+C
- interrupt lifecycle
- auto snapshot on interrupt
- yuan resume --latest

P1
- session list / preview / fork
- safe quit
- background task exit guard

P2
- suspend mode
- failure recovery mode
- multi-snapshot rollback
```

---

# 한 줄 결론

네가 말한 방향 완전 맞아.

특히 이건 꼭 박아야 해:

```text
Ctrl+C는
"항상 종료"가 아니라
"상황 인지형 copy / interrupt / exit"여야 한다.

Resume는
"대화 복원"이 아니라
"실행 세션 복원"이어야 한다.
```

이 두 개만 제대로 넣어도 YUA는 그냥 에이전트 콘솔이 아니라
**“안심하고 오래 쓰는 작업 운영체제”** 느낌이 난다.

다음 답변에서 원하면 내가 이걸 바로
**YUA CLI PRD용 섹션 번호 형식(예: 8.1, 8.2, 8.3...)**으로 정식 문서 톤으로 재작성해줄게.


좋음. 이건 문서에 꼭 넣어야 함.
특히 **“파일에서 이미지 분석해줘”라고 했을 때 진짜 이미지 자체를 보게 하는 규칙**이 없으면, 나중에 시스템이 텍스트만 긁고 “분석한 척” 하게 된다.

아래처럼 **섹션 초안 + 필수 기능 + 툴/플러그인 추천**으로 바로 넣으면 된다.

---

## 1. File-based Image Analysis 섹션 초안

```text
[Section Name]
File-based Image Analysis

[목적]
- 사용자가 업로드한 파일 안의 이미지를 실제로 분석한다.
- 텍스트 추출만으로 대체하지 않고, 시각 정보(레이아웃, 차트, UI, 도표, 스크린샷, 사진)를 직접 해석한다.
- 이미지가 포함된 PDF/문서/스크린샷도 "진짜 이미지 분석" 경로로 처리한다.

[핵심 원칙]
- 이미지가 있으면 먼저 vision path를 검토한다.
- OCR은 기본값이 아니라 fallback이다.
- 표/차트/스크린샷/슬라이드/PDF 페이지는 시각 구조까지 해석해야 한다.
- "분석"과 "생성"을 분리한다.
- 분석 결과는 근거(어떤 파일/페이지/영역을 봤는지)와 함께 남긴다.
```

OpenAI Responses API는 **텍스트와 이미지 입력을 함께 받을 수 있고**, 파일 입력도 `input_file`로 전달할 수 있다. 파일은 **base64, 파일 ID, 외부 URL** 방식으로 넣을 수 있다. 또 최신 이미지/비전 가이드는 최근 모델이 **이미지 입력을 분석하는 vision 기능**을 지원한다고 설명한다. ([OpenAI 개발자 센터][1])

---

## 2. 이미지 분석 라우팅 정책

```text
[Feature]
Image Analysis Routing Policy

[입력 유형]
- png / jpg / jpeg / webp
- pdf
- ppt / pptx 내 렌더 이미지
- 문서 스캔본
- UI 스크린샷
- 차트 / 그래프 이미지
- 사진
```

```text
[라우팅 규칙]
1. 사용자가 "이미지 분석", "스크린샷 봐줘", "이 PDF의 차트 설명해줘"라고 요청하면
   → Vision Analysis Path 우선

2. PDF 안에 표/차트/다이어그램/슬라이드 이미지가 있으면
   → 페이지 이미지 렌더 후 Vision Analysis Path

3. 이미지 안의 텍스트만 필요한 경우
   → OCR Assist Path 가능

4. 이미지 품질이 낮거나 스캔 품질이 나쁘면
   → Vision + OCR hybrid path

5. 레이아웃/구성/색/강조/도식 관계가 중요한 경우
   → OCR-only 금지
```

OpenAI 문서는 파일 입력과 이미지 분석을 별도 기능으로 다루면서, 파일 검색은 지식 검색용이고 이미지/비전은 시각 입력 분석용으로 구분한다. 즉, **업로드 파일 검색**과 **실제 이미지 보기**는 같은 게 아니다. ([OpenAI 개발자 센터][2])

---

## 3. 필수 기능

```text
[필수 기능]
1. Vision-first file handling
- 이미지 파일은 바로 vision 모델로 전달
- PDF는 페이지 렌더 또는 이미지 추출 후 분석

2. Region-aware analysis
- 페이지 번호
- 이미지 index
- bounding region 또는 관심 영역 메타데이터 기록

3. Image type detection
- photo
- screenshot
- chart
- diagram
- slide
- scanned document
- mixed page

4. OCR fallback only
- dense text extraction이 필요한 경우에만 OCR 사용
- OCR 결과를 이미지 분석 결과와 별도로 표시

5. Evidence trace
- 어떤 파일 / 페이지 / 이미지에서 어떤 결론을 냈는지 남김

6. Safety / confidence
- 해상도 낮음 / 가림 / 잘림 / 판독 불가 시 불확실성 표시
```

---

## 4. 추천 처리 파이프라인

```text
[Pipeline]
User file upload
→ file type detection
→ image presence detection
→ if image exists:
     vision analysis path
     ↳ optional OCR assist
→ if PDF:
     page render / page image extraction
→ structured result
→ validator
→ user-facing summary + cited evidence
```

```text
[Structured Output Example]
- file_id
- page_number
- image_index
- image_type
- extracted_visible_text
- visual_summary
- key_entities
- chart_or_layout_findings
- confidence
- limitations
```

---

## 5. YUA에서 꼭 넣어야 하는 “진짜 이미지 분석” 규칙

```text
[Hard Rules]
- "analyze image" 요청 시 OCR-only 경로 금지
- "PDF 차트/표 설명" 요청 시 file-search-only 경로 금지
- screenshot bug analysis는 vision path 필수
- design/layout critique는 vision path 필수
- image evidence 없는 추론은 "추정"으로 표시
```

---

## 6. 어떤 툴을 넣어야 하나 — 추천 툴 스택

여긴 YUA v1 기준으로 **너무 많이 말고 실전적인 것만** 추천할게.

### 핵심 런타임 툴

```text
[Core Runtime Tools]
1. OpenAI Responses API
- 텍스트 + 이미지 입력
- built-in tools
- stateful response chaining

2. OpenAI File Inputs
- 업로드 파일 ID 기반 처리
- external URL / base64 입력 가능

3. OpenAI File Search
- 업로드 파일에서 semantic + keyword 검색

4. OpenAI Computer Use
- 브라우저 / 데스크톱 조작형 에이전트 작업

5. Function calling
- 자체 백엔드 로직 / DB / 사내 API 연결

6. Shell / code execution harness
- 코드/테스트/변환/렌더용
```

Responses API는 현재 OpenAI의 핵심 응답 인터페이스이고, **text/image inputs**, **web search**, **file search**, **computer use**, **function calling**을 같은 계열에서 연결할 수 있다. Agents SDK는 specialized agents, handoff, streaming, traces를 지원하도록 설계돼 있다. ([OpenAI 개발자 센터][3])

### 이미지/문서 처리용 보조 툴

```text
[Image / Document Support Tools]
1. PDF page renderer
- PDF 페이지를 이미지로 변환
- 차트/슬라이드/도표용

2. OCR engine
- fallback only
- dense scanned text extraction

3. Image preprocessing
- rotate
- crop
- contrast boost
- denoise

4. Metadata extractor
- EXIF / dimensions / mime / page count / embedded image count
```

---

## 7. Plugin / Plugin-like 확장 섹션 초안

여기서 중요한 건, 요즘은 예전식 “브라우저 플러그인”보다
**MCP 서버 + slash commands + hooks + agent bundles** 쪽이 훨씬 맞다.

Anthropic은 2025년에 Claude Code plugins를 **slash commands, agents, MCP servers, hooks를 한 번에 설치하는 묶음**으로 소개했다. MCP 자체는 Anthropic이 공개한 오픈 프로토콜이고, 공식 사양은 **도구와 외부 시스템 연결용 표준 인터페이스**로 설명한다. ([안트로픽][4])

```text
[Section Name]
Plugins and Extension System

[목적]
- YUA의 기능을 코어 수정 없이 확장한다.
- 외부 도구, 사내 시스템, 워크플로우를 표준 방식으로 연결한다.

[확장 단위]
1. Slash Commands
2. Agents
3. Hooks
4. MCP Servers
5. UI Panels / Widgets
6. Tool Providers
```

---

## 8. 플러그인 시스템에서 꼭 지원해야 할 것

```text
[Plugin Required Capabilities]
1. Tool registration
- 새 도구 등록
- schema / permission / category 메타데이터 포함

2. Slash command registration
- /research
- /design
- /image-analyze
- /session resume
같은 커맨드 추가

3. Agent registration
- specialized agent 추가
- role / allowed tools / budget 지정

4. Hook registration
- pre-task
- pre-tool
- post-task
- on-failure
- on-resume

5. UI contribution
- command palette 항목
- 오른쪽 패널
- status badge
- result card
```

---

## 9. MCP 중심 플러그인 추천

MCP는 지금 **툴 연결 표준**으로 잡기 좋다.
MCP 문서는 서버가 파일시스템, DB, GitHub, Slack, 캘린더 같은 기능을 노출할 수 있다고 설명한다. ([모델 컨텍스트 프로토콜][5])

```text
[Recommended Plugin Architecture]
Core app
├ built-in tools
├ built-in agents
└ MCP client layer
     ├ filesystem server
     ├ postgres server
     ├ github server
     ├ slack / notion server
     ├ figma / design server
     ├ browser automation server
     └ internal business tools server
```

### YUA에 추천하는 플러그인/도구 카테고리

```text
[Recommended Plugin Categories]
1. Filesystem
- 로컬/프로젝트 파일 읽기 쓰기

2. Git / GitHub
- PR 조회
- issue 조회
- diff / review

3. Database
- Postgres read
- analytics query
- admin-safe query

4. Docs / Knowledge
- Notion
- Google Drive
- internal docs

5. Design
- Figma read
- design tokens
- screenshot compare

6. Browser / QA
- browser automation
- screenshot capture
- DOM / accessibility check

7. Communication
- Slack
- email
- calendar

8. Image / Media
- asset library
- image metadata
- OCR assist
- thumbnail / crop / render
```

---

## 10. 이미지 분석 전용 플러그인 섹션 추가안

```text
[Section Name]
Image Analysis Plugins

[목적]
- 업로드된 이미지 / PDF / 스크린샷 / 슬라이드에 대한 고급 시각 처리 기능을 확장 가능하게 한다.

[권장 플러그인 타입]
1. PDF Render Plugin
- page to image
- embedded image extraction

2. OCR Assist Plugin
- dense text extraction
- multilingual OCR

3. Image Preprocess Plugin
- crop / rotate / denoise / contrast

4. Design Review Plugin
- layout critique
- spacing hierarchy detection
- UI consistency hints

5. Chart Interpreter Plugin
- chart-type detection
- axis / legend / anomaly extraction
```

---

## 11. 추천 우선순위

지금 당장 넣을 것만 추리면 이거다.

```text
P0
- Vision-first file routing
- PDF page render
- OCR fallback
- evidence trace
- slash command: /image analyze
- slash command: /context compact
- plugin system skeleton
- MCP client layer

P1
- design review plugin
- chart interpreter plugin
- browser QA plugin
- screenshot bug analysis

P2
- full plugin marketplace
- plugin install/update UI
- org-level plugin policy
```

---

## 12. 문서에 바로 붙이는 최종 요약 블록

```text
추가 섹션 제안

1. File-based Image Analysis
- vision-first routing
- PDF page rendering
- OCR fallback only
- screenshot/chart/diagram aware analysis
- evidence trace

2. Tool Stack
- Responses API
- file inputs
- file search
- computer use
- function calling
- shell/code execution
- PDF renderer
- OCR assist
- image preprocessing

3. Plugins and Extension System
- slash commands
- agents
- hooks
- MCP servers
- UI panels
- tool providers

4. Image Analysis Plugins
- PDF render plugin
- OCR assist plugin
- image preprocess plugin
- design review plugin
- chart interpreter plugin
```

내 추천 한 줄은 이거야:

**이미지 분석은 “파일 검색”이 아니라 “vision-first”로 설계하고, 플러그인은 예전식 plugin보다 `MCP + slash commands + hooks + agent bundles` 조합으로 가는 게 맞다.** ([안트로픽][4])

원하면 다음 답변에서 이걸 바로 **YUA PRD 형식으로 8.1 / 8.2 / 8.3 번호 붙여서 정식 문서체**로 바꿔줄게.

[1]: https://developers.openai.com/api/docs/guides/file-inputs?utm_source=chatgpt.com "File inputs | OpenAI API"
[2]: https://developers.openai.com/api/docs/guides/tools-file-search?utm_source=chatgpt.com "File search | OpenAI API"
[3]: https://developers.openai.com/api/reference/responses/overview?utm_source=chatgpt.com "Responses Overview | OpenAI API Reference"
[4]: https://www.anthropic.com/news/claude-code-plugins?ref=refind&utm_source=chatgpt.com "Customize Claude Code with plugins \ Anthropic"
[5]: https://modelcontextprotocol.io/docs/learn/server-concepts?utm_source=chatgpt.com "Understanding MCP servers - Model Context Protocol"



npx expo start --dev-client --tunnel
eas build --profile development --platform android