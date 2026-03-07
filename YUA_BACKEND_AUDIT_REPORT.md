# YUA AI Backend — Comprehensive Audit Report

**Date:** 2026-03-06
**Scope:** yua-backend 전체 (1,125 TS files)
**Auditor:** Claude Opus 4.6 (Agent-based deep inspection)

---

## Executive Summary

YUA AI 백엔드 전반에 대한 코드 레벨 감사 수행. 총 **28건의 이슈** 식별.
- **CRITICAL**: 12건 (즉시 수정 필요)
- **HIGH**: 9건
- **MEDIUM**: 5건
- **LOW/FALSE**: 2건 (원래 리포트의 오판)

원래 감사 리포트의 CRITICAL 8건 중 **6건 확인, 2건 오판(FALSE)**, 추가로 **6건의 새로운 CRITICAL** 발견.

---

## Part 1: CRITICAL Issues (12건)

### CR-1. inputOverride 시 SYSTEM_CORE_FINAL 미전달
- **파일:** `openai-runtime.ts:442-450`
- **상태:** NEW CRITICAL (원래 리포트 미포함)
- **문제:** Continuation segment에서 `inputOverride` 사용 시 SYSTEM_CORE_FINAL (YUA 정체성, 언어 정책, 보안 규칙), developerHint, reasoningLanguageHint 모두 누락
- **영향:** 매 continuation마다 모델이 시스템 규칙을 완전히 잃음. 검색 후 응답 품질 급락의 직접 원인
- **수정:** inputOverride 사용 시에도 system message를 선두에 삽입

### CR-2. 검색 후 맥락 완전 손실 (3중 결함)
- **파일:** `chat-engine.ts:1014`, `execution-engine.ts:1059-1070`, `continuation-prompt.ts:102-119`
- **상태:** NEW CRITICAL
- **문제:**
  1. ContextRuntime에 `searchResults: []` 항상 빈 배열 전달
  2. Tool output continuation에서 원래 질문/맥락 미포함
  3. Continuation prompt에 메모리/제약사항/검색결과 전무
- **영향:** 검색 도구 실행 후 모델이 검색 이유, 사용자 질문, 시스템 규칙을 모두 잃음
- **수정:** searchResults 실제 전달 + continuation prompt에 full context 포함

### CR-3. Cross-thread Memory 미통합
- **파일:** `context-runtime.ts:369-395`, `research-engine.ts:27`
- **상태:** CONFIRMED + 확장
- **문제:**
  - ContextRuntime: `project_architecture`, `project_decision`만 로드. `user_profile`, `user_preference`, `user_research` 미로드
  - Research Engine: `context` scope만 로드. user memory 완전 부재
  - Cross-Memory Orchestrator: 조건부 로드 (anchorConfidence >= 0.6, ANSWER 모드만)
- **영향:** 스레드 전환/검색 후 사용자 이름, 선호도, 이전 리서치 완전 손실
- **수정:** user scope memory를 ContextRuntime/ResearchEngine에서 항상 로드

### CR-4. analyze_csv 도구 미작동 (3중 결함)
- **파일:** `openai-tool-registry.ts:189-222`, `execution-engine.ts:700-720`, `execution-engine.ts:1858-1892`
- **상태:** CONFIRMED
- **문제:**
  1. 도구 핸들러가 stub (`DELEGATED_TO_FILE_ANALYZER` 반환만)
  2. 도구가 model 호출 시 tool 목록에 추가되지 않음 (CSV 첨부 감지 로직 없음)
  3. CSV 파서(`csv.ts`)는 구현되었으나 파이프라인에 미연결
- **영향:** CSV 분석 기능 완전 불능

### CR-5. toolScoreDelta 미누적 (Dead Code)
- **파일:** `tool-score-accumulator.ts:20-33`, `execution-engine.ts:2182-2183`, `confidence-router.ts:37-40`
- **상태:** CONFIRMED
- **문제:**
  1. `accumulateToolScore()` 함수 정의됨 but 호출처 없음 (DEAD CODE)
  2. `accumulatedConfidenceDelta` 로컬 변수에만 누적, 이후 미사용 (DEAD VARIABLE)
  3. `getAccumulatedToolScore()` 항상 0 반환
- **영향:** 도구 학습/피드백 루프 불존재

### CR-6. Tool Output Prompt Injection 가능
- **파일:** `prompt-runtime.ts:193-208`, `prompt-builder.ts:1281-1288`
- **상태:** CONFIRMED
- **문제:**
  - `renderTrustedFacts()`에서 `JSON.stringify(f.latest?.fields)` 직접 삽입
  - `[SYSTEM FACT - VERIFIED AND MANDATORY]` 블록에 sanitize 없이 주입
  - 메모리 컨텍스트도 escape 없이 직접 삽입 (`prompt-builder.ts:1177-1194`)
- **공격 시나리오:** Tool output에 `"IGNORE_ABOVE_INSTRUCTIONS..."` 삽입 시 시스템 프롬프트 탈취 가능
- **수정:** 모든 외부 데이터에 prompt injection 방어 적용

### CR-7. developerHint 부분 전달
- **파일:** `execution-engine.ts:116-124, 514, 1122`
- **상태:** PARTIALLY CONFIRMED
- **문제:**
  1. `buildDeveloperHint()`은 `userName`만 포함 (메모리 컨텍스트 미포함)
  2. Continuation segment(`segmentIndex > 0`)에서 `undefined` 전달
- **영향:** 모델이 사용자 이름을 continuation에서 잊음

### CR-8. FAST/NORMAL/DEEP 모드 실질 차이 없음
- **파일:** `chat-fast-path.ts`, `chat-normal-path.ts`, `chat-deep-path.ts`
- **상태:** CONFIRMED
- **문제:** 세 파일 모두 `return runLegacyChat(ctx)` — 동일 함수 호출
- **유일한 차이:** `continuation-decision.ts:88-96`에서 DEEP만 기본 2 segment 허용
- **영향:** 사용자가 DEEP 모드 선택해도 FAST와 동일 처리

### CR-9. trimByTokenBudget 역설적 절단
- **파일:** `prompt-runtime.ts:183-191, 418-421`
- **상태:** BUG CONFIRMED (원래 리포트 FALSE 판정 → 재검증 후 버그 확정)
- **문제:**
  1. "앞부분 유지" 전략이지만, conversationState가 시간순(오래된→최신) 배치되어 **최신 대화가 잘림**
  2. `HARD_REF_TOKEN_CAP = 6000` 초과 시 뒤부분 자동 절단
  3. `estimateTokens()` 한글/영문 혼합 시 오차 발생 → `approxChars = maxTokens * 4` 부정확
- **영향:** 긴 대화에서 최신 맥락 손실, 요약 불완전

### CR-10. 메시지 히스토리 다층 제한 혼란
- **파일:** `pg-readonly.ts:35-40`, `buildConversationContext.ts:74`, `chat-engine.ts:914-920`
- **상태:** CONFIRMED (원래 리포트 "8개 하드코딩" → 정확히는 다층 제한)
- **문제:**
  - Layer 1: `fetchRecentChatMessages(limit=20)` → 최대 50
  - Layer 2: `buildConversationContext .slice(-10)` → 최대 10
  - Layer 3: `chat-engine historyDepth` → FAST=8, NORMAL=12, DEEP=20
  - 세 레이어가 독립적으로 작동, ThinkingProfile 반영 불일치
- **영향:** FAST 모드에서 8개만 사용, 긴 대화 맥락 손실

### CR-11. 이미지 분석 결과 모델에 미전달
- **파일:** `execution-engine.ts:1825-1854`
- **상태:** CONFIRMED
- **문제:** `analyze_image` 처리에서 activity artifact만 발행, `nativeToolOutputs`에 결과 미기록 → model continuation에 분석 결과 미전달
- **영향:** 이미지 분석 기능 사실상 불능

### CR-12. Memory ENABLED 조건부 작동 (실질적 비활성)
- **파일:** `chat-engine.ts:1878-1911`, `memory-auto-commit.ts`
- **상태:** PARTIALLY CONFIRMED
- **문제:**
  1. `shouldAutoCommitMemory()`에 `AnswerState`를 `undefined`로 전달 → 가드 비활성
  2. 다수의 조건(신뢰도, continuity, policy)으로 대부분 `SKIPPED`
  3. 메모리 조회는 `project_architecture`/`project_decision`만 (user scope 미로드)
- **영향:** 메모리 커밋률 매우 낮음, 사용자 정보 축적 불능

---

## Part 2: HIGH Issues (9건)

### HI-1. VisionEngine 미연결
- **파일:** `vision-engine.ts` vs `execution-engine.ts`
- VisionEngine.analyzeImage() 구현되었으나 execution pipeline에서 호출 안됨

### HI-2. CSV 파서 미연결
- **파일:** `file-intel/extractors/csv.ts`
- extractCsv() 완전 구현, 하지만 도구 실행 파이프라인에 미연결

### HI-3. Continuation segment에서 developerHint 누락
- **파일:** `execution-engine.ts:1122`
- `segmentIndex === 0`일 때만 전달, 이후 `undefined`

### HI-4. reasoningLanguageHint inputOverride 시 미적용
- **파일:** `openai-runtime.ts:452`
- Tool continuation 이후 reasoning summary가 잘못된 언어로 생성 가능

### HI-5. Continuation 시 reasoning chain 전달 없음
- **파일:** `reasoning-session-controller.ts:34-47`
- 각 요청마다 새 세션 생성, 이전 reasoning depth/confidence 미활용

### HI-6. 검색 결과 랭킹/점수화 없음
- **파일:** `tool-result-normalizer.ts`
- Web search 결과에 관련성 점수 없음. `relevanceScore` 타입 정의만 있고 계산 로직 없음

### HI-7. ContextMerger weighted selection 제한
- **파일:** `context-merger.ts:88-97`
- ENTITY 모드 시 3개 청크만 선택. Memory 10개 있어도 3개만 사용

### HI-8. Stream publish 순차 실행
- **파일:** `execution-engine.ts:1231+`
- `for await` 루프 내 `await publishActivity()` 순차 호출. 배칭/병렬화 없음

### HI-9. DB 캐시 없음 (워크스페이스 롤)
- **파일:** `workspace-access.ts:60-76`, `workspace-context.ts:39-58`
- 매 API 요청마다 DB 조회. Redis TTL 캐시 미사용. 10 req/sec 시 50+ DB 쿼리/초

---

## Part 3: MEDIUM Issues (5건)

### MD-1. ToolGate 우회 가능 (부분적)
- **파일:** `tool-gate.ts:59-66`, `execution-engine.ts:667-680`
- code_interpreter 자동 허용, SEARCH path override로 제약 우회 가능

### MD-2. 웹 검색 UNSUPPORTED
- **파일:** `openai-tool-registry.ts:57-68, 94-96`
- `web_search`, `web_fetch` 항상 `UNSUPPORTED` 반환. 의도적 미지원이지만 대체 경로 명확하지 않음

### MD-3. Stream 이벤트 DB 쓰기 배칭 없음
- **파일:** `stream-engine.ts:1068`
- 매 토큰마다 `insertStreamEvent()` 비동기 호출. 초당 수백 건 DB 쓰기

### MD-4. Generated Explanation 감지 후 자동 강등
- **파일:** `context-runtime.ts:315-320`
- 이전 메시지가 자동 생성 요약이면 contextCarryLevel을 ENTITY(최약)로 강등

### MD-5. Code/Large Input 시 Heavy Memory 차단
- **파일:** `context-runtime.ts:268-271`
- `userMessageLength > 3000`이면 메모리 로드 차단

---

## Part 4: FALSE (원래 리포트 오판, 2건)

### FALSE-1. ~~Redis unsubscribe 없음~~ → 정상 구현됨
- **파일:** `stream-engine.ts:1278-1280`, `workspace-docs-ws.ts:233`, `security-wsr.ts:58`
- 3개 채널 모두 unsubscribe 정상 호출, refcount 기반 정리도 있음

### FALSE-2. ~~세션 재등록 시 reasoning buffer 미정리~~ → 자동 초기화됨
- **파일:** `reasoning-session-controller.ts:34-47`, `chat-engine.ts:519-535`
- 각 호출마다 새 ReasoningSessionController 인스턴스 생성, 버퍼 자동 초기화

---

## Part 5: Priority Matrix

### Phase 1 — 긴급 (1-2 weeks)

| # | 이슈 | 파일 | 수정 난이도 |
|---|------|------|-----------|
| CR-1 | inputOverride 시 SYSTEM_CORE_FINAL 미전달 | openai-runtime.ts:442-450 | 낮음 (1h) |
| CR-2 | 검색 후 맥락 손실 (3중 결함) | chat-engine.ts, execution-engine.ts, continuation-prompt.ts | 중간 (4-8h) |
| CR-6 | Tool output prompt injection | prompt-runtime.ts, prompt-builder.ts | 중간 (2-4h) |
| CR-7 | developerHint 부분 전달 | execution-engine.ts:116-124, 1122 | 낮음 (1h) |
| CR-9 | trimByTokenBudget 역설적 절단 | prompt-runtime.ts:183-191 | 낮음 (2h) |

### Phase 2 — 단기 (2-4 weeks)

| # | 이슈 | 파일 | 수정 난이도 |
|---|------|------|-----------|
| CR-3 | Cross-thread memory 미통합 | context-runtime.ts, research-engine.ts | 중간 (4-8h) |
| CR-4 | analyze_csv 도구 미작동 | openai-tool-registry.ts, execution-engine.ts | 중간 (4-6h) |
| CR-11 | 이미지 분석 결과 미전달 | execution-engine.ts:1825-1854 | 낮음 (2h) |
| HI-1 | VisionEngine 미연결 | vision-engine.ts, execution-engine.ts | 중간 (3-4h) |
| HI-9 | DB 캐시 없음 | workspace-access.ts | 낮음 (1-2h) |
| CR-10 | 메시지 히스토리 다층 제한 | pg-readonly.ts, buildConversationContext.ts, chat-engine.ts | 중간 (3-4h) |

### Phase 3 — 중기 (4-8 weeks)

| # | 이슈 | 파일 | 수정 난이도 |
|---|------|------|-----------|
| CR-5 | toolScoreDelta 미누적 | tool-score-accumulator.ts, execution-engine.ts | 중간 (4h) |
| CR-8 | FAST/NORMAL/DEEP 모드 무차별 | chat-*-path.ts | 높음 (8-16h) |
| CR-12 | Memory 실질적 비활성 | chat-engine.ts, memory-auto-commit.ts | 높음 (8h) |
| HI-5 | Continuation reasoning chain 없음 | reasoning-session-controller.ts | 높음 (8h) |
| HI-6 | 검색 결과 랭킹 없음 | tool-result-normalizer.ts | 높음 (8-16h) |
| HI-8 | Stream publish 순차 실행 | execution-engine.ts | 중간 (4-8h) |

---

## Part 6: Cross-Memory & User-Friendly Name 설계 제안

### 현재 문제

```
Thread A: "나는 김철수, 파이썬 좋아해"
  → user_profile 저장 (workspace scope)

Thread B: (검색 모드) "AI 트렌드 정리해줘"
  → research-engine: context scope만 로드
  → user_profile 미로드
  → 모델: "사용자 정보 없음"

Thread C: (일반 대화) "아까 얘기한 거 이어서"
  → context-runtime: project_* scope만 로드
  → user_profile/preference 미로드
  → 모델: "아까 무슨 얘기?"
```

### 제안 아키텍처: Unified Memory Layer

```
                    ┌─────────────────────────────┐
                    │     Unified Memory Gate      │
                    │  (모든 경로에서 호출)          │
                    └──────────┬──────────────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
    ┌─────▼─────┐      ┌──────▼──────┐     ┌──────▼──────┐
    │ User Layer │      │ Project     │     │ Thread      │
    │            │      │ Layer       │     │ Layer       │
    │ - name     │      │ - arch      │     │ - topic     │
    │ - language │      │ - decisions │     │ - context   │
    │ - prefs    │      │ - goals     │     │ - summary   │
    │ - research │      │ - refs      │     │ - turns     │
    └────────────┘      └─────────────┘     └─────────────┘
         always              if project          if thread
         loaded              context exists      context exists
```

### Memory Scope 확장안

```typescript
// 현재 (불완전)
type MemoryScope =
  | "user_profile" | "user_preference" | "user_research"
  | "project_architecture" | "project_decision"
  | "general_knowledge";

// 제안 (확장)
type MemoryScope =
  // User Layer (cross-thread, cross-project)
  | "user_profile"        // 이름, 언어, 역할
  | "user_preference"     // 커뮤니케이션 스타일, 기술 선호
  | "user_research"       // 장기 리서치 컨텍스트
  // Project Layer (cross-thread within project)
  | "project_architecture"
  | "project_decision"
  | "project_goal"        // NEW: 프로젝트 목표/방향
  | "project_reference"   // NEW: 프로젝트 참조 문서
  // Thread Layer (single thread)
  | "thread_context"
  | "thread_summary"
  // General
  | "general_knowledge";
```

### User-Friendly Name 설계

```typescript
// execution-engine.ts buildDeveloperHint 확장안
function buildDeveloperHint(opts: {
  userName?: string;
  userProfile?: UserProfileMemory;   // NEW
  projectContext?: ProjectMemory;    // NEW
}): string {
  const parts: string[] = [];

  // User identity (항상 포함)
  if (opts.userName) {
    parts.push(`사용자 이름: ${opts.userName}`);
  }
  if (opts.userProfile?.language) {
    parts.push(`선호 언어: ${opts.userProfile.language}`);
  }
  if (opts.userProfile?.role) {
    parts.push(`역할: ${opts.userProfile.role}`);
  }

  // Project context (프로젝트 존재 시)
  if (opts.projectContext) {
    parts.push(`현재 프로젝트: ${opts.projectContext.name}`);
    if (opts.projectContext.goal) {
      parts.push(`프로젝트 목표: ${opts.projectContext.goal}`);
    }
  }

  return parts.join("\n");
}
```

### Context Runtime 수정안

```typescript
// context-runtime.ts — User memory 항상 로드
const userMemory = allowMemory
  ? await MemoryManager.retrieveByScopes({
      workspaceId,
      userId,   // NEW: user-specific
      scopes: ["user_profile", "user_preference"],
      limit: 3, // 경량: 항상 로드해도 부담 없음
    })
  : [];

// Project memory (프로젝트 컨텍스트 존재 시)
const projectMemory = allowMemory && projectId
  ? await MemoryManager.retrieveByScopes({
      workspaceId,
      projectId,
      scopes: ["project_architecture", "project_decision", "project_goal"],
      limit: MAX_MEMORY_CHUNKS,
    })
  : [];

// Thread memory (기존)
const threadMemory = /* 기존 로직 유지 */;
```

---

## Appendix: Issue ID Cross-Reference

| Audit Report ID | This Report ID | Status |
|----------------|---------------|--------|
| CH-1 (developerHint) | CR-7 | PARTIALLY CONFIRMED |
| CH-2 (메시지 히스토리 8개) | CR-10 | CONFIRMED (다층 제한) |
| CH-3 (trimByTokenBudget) | CR-9 | BUG CONFIRMED (재검증) |
| CH-4 (reasoning buffer) | FALSE-2 | FALSE |
| CH-5 (cross-thread memory) | CR-3 | CONFIRMED + 확장 |
| TP-1 (analyze_csv) | CR-4 | CONFIRMED |
| TP-2 (toolScoreDelta) | CR-5 | CONFIRMED |
| TP-3 (이미지 분석) | CR-11 | CONFIRMED |
| TP-4 (웹 검색) | MD-2 | CONFIRMED (의도적) |
| TP-5 (ToolGate) | MD-1 | PARTIAL |
| TP-6 (도구 중복) | — | FALSE |
| PF-1 (Redis unsubscribe) | FALSE-1 | FALSE |
| PF-2 (Stream publish 순차) | HI-8 | CONFIRMED |
| PF-3 (JSON stringify 루프) | — | 허용 범위 |
| PF-4 (Session cleanup) | — | 정상 구현됨 |
| PF-5 (DB 캐시) | HI-9 | CONFIRMED |
| RQ-1 (memory ENABLED) | CR-12 | PARTIALLY CONFIRMED |
| RQ-2 (FAST/NORMAL/DEEP) | CR-8 | CONFIRMED |
| RQ-3 (예산 제어) | CR-8 내 포함 | CONFIRMED |
| RQ-4 (continuation reasoning) | HI-5 | CONFIRMED |
| RQ-5 (검색 랭킹) | HI-6 | CONFIRMED |
| — (NEW) | CR-1 | inputOverride SYSTEM_CORE_FINAL |
| — (NEW) | CR-2 | 검색 후 맥락 3중 손실 |
| — (NEW) | CR-6 | Prompt injection |
| — (NEW) | HI-1 | VisionEngine 미연결 |
| — (NEW) | HI-2 | CSV 파서 미연결 |
| — (NEW) | HI-4 | reasoningLanguageHint 미적용 |
