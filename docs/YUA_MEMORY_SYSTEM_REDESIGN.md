# YUA Memory System Redesign — FINAL SPEC

> 작성: 2026-03-08
> 상태: Phase 1 구현 대기
> 검증: Claude 설계 + GPT 프로덕션 리뷰 반영

---

## 1. 현황 진단

### 1.1 Critical Bug (Problem 0)
```
chat-engine.ts 메모리 블록 4개 전부 `!meta.stream` 가드
→ 실제 유저(항상 stream=true) = 메모리 저장 0건
→ 메모리 시스템 100% 비활성 상태
```

### 1.2 파일 감사 결과 (73개)
| 상태 | 개수 | 비율 |
|------|------|------|
| LIVE | 22 | 30% |
| INTERNAL | 7 | 10% |
| DEAD | 44 | 60% |

### 1.3 파이프라인 병목 (4개)
1. **스트리밍 가드**: `!meta.stream` → 전체 파이프라인 사망
2. **키워드 전용 탐지**: "기억해"/"remember" 없으면 intent=NONE
3. **executionPlan 의존**: DIRECT_CHAT엔 executionPlan 없음 → candidate 생성 불가
4. **이중 게이트**: decision-orchestrator의 `isStorableIntent` regex가 추가 필터링

---

## 2. 아키텍처 설계

### 2.1 트리거 방식: Stream End Hook (GPT 리뷰 반영)

기존 Claude 제안 `fire-and-forget`의 lost write 위험 → **stream 완료 후 hook** 방식 채택.

```
Stream Lifecycle:
  FINAL → SUGGESTION → SUMMARY → MEMORY PIPELINE → DONE
```

구현 위치: `execution-engine.ts` (이미 summary를 SUGGESTION과 DONE 사이에 넣음)
메모리 파이프라인도 같은 위치에 배치.

```typescript
// execution-engine.ts — stream 완료 후 순차 실행
await StreamEngine.publishFinal(threadId, { traceId });
await ChatEngine.emitSuggestions({ ... });

// 🔒 SUMMARY (이미 구현됨)
fetchRecentChatMessages(threadId, 50)
  .then(rows => updateConversationSummary(threadId, ...))
  .catch(e => console.warn(...));

// 🔒 MEMORY PIPELINE (신규)
await runMemoryPipeline({
  threadId, traceId, userId, workspaceId,
  userMessage, assistantMessage, mode, reasoning
});

await StreamEngine.publishDone(threadId, { traceId, reason: "completed" });
```

핵심: `await`로 실행하되 DONE 전에 완료. Lost write 방지 + 응답 지연 없음 (이미 FINAL 발행 후).

### 2.2 Two-Track Memory Detection

```
Track 1: Implicit Detector (신규)
  유저 메시지 → regex + embedding 패턴 매칭
  → USER_FACT / USER_PREFERENCE / PROJECT_DECISION / CORRECTION
  → confidence scoring → auto-commit

Track 2: Execution-Based (기존, 게이트 완화)
  executionPlan + executionResult → generateMemoryCandidate
  → dedup → auto-commit
```

### 2.3 전체 파이프라인 (신규)

```
유저 메시지
  ├─ [Implicit Track] regex+embedding → category → score
  └─ [Execution Track] executionResult → candidate → score (기존)
      ↓
  Candidate 선택 (높은 score 우선)
      ↓
  Dedup Check (cosine sim ≥ 0.90)
      ↓
  Conflict Check (negation embedding, sim ≥ 0.70)
      ↓
  Auto-Commit Gate (score ≥ 0.45)
      ↓
  memory-manager.commit() → DB 저장
      ↓
  SSE notify (PENDING/SAVED/SKIPPED/CONFLICT)
```

---

## 3. Implicit Memory Detector

### 3.1 탐지 카테고리

| 카테고리 | 패턴 예시 | Base Confidence |
|---------|----------|----------------|
| USER_FACT | "나 삼성전자 100주 갖고있어", "I work at Google" | 0.75-0.90 |
| USER_PREFERENCE | "코드는 TypeScript로 짜줘", "항상 다크모드" | 0.70-0.85 |
| PROJECT_DECISION | "DB는 PostgreSQL로 가자", "스택 확정" | 0.80-0.90 |
| CORRECTION | "아니 그게 아니라...", "틀렸어" | 0.70-0.80 |

### 3.2 탐지 전략: Regex + Embedding (GPT 리뷰 반영)

```
Step 1: Regex pre-filter (fast, sync)
  → 소유 패턴: 나(는|) .*(있어|갖고|보유)
  → 지시 패턴: (로|으로) (짜줘|해줘|만들어줘)
  → 결정 패턴: (로 가자|로 하자|확정)
  → 교정 패턴: (아니|틀렸|그게 아니라)

Step 2: Negative filter (sync)
  → 5자 미만, 순수 리액션(ㅋㅋ, ㅇㅇ, ok)
  → 순수 질문(? only), 시간 한정(오늘 날씨)
  → 인사(안녕, hi, hello)

Step 3: Embedding similarity confirm (async, optional)
  → regex miss 보완: "espresso 좋아해" → regex miss
  → 기존 user_preference 메모리와 embedding sim > 0.60이면 catch
  → recall 향상 (regex only: ~70% → regex+embedding: ~90%)
```

### 3.3 Negative Filter 목록

```typescript
const NOISE_PATTERNS = [
  /^[ㅋㅎ]+$/,                    // 순수 리액션
  /^(ㅇㅇ|ㄴㄴ|응|아|ok|lol)$/i,  // 단답
  /^(안녕|반가워|hi|hello|hey)/i,  // 인사
];

const TEMPORAL_PATTERNS = [
  /^(오늘|지금|방금|현재).*(날씨|몇시|뉴스)/,  // 시간 한정 질문
];
```

---

## 4. Candidate Scoring (6-Factor 모델)

### 4.1 수식 (GPT Stability 팩터 반영)

```
Score = 0.22·D + 0.25·U + 0.15·T + 0.12·R + 0.13·V + 0.13·S
```

| Factor | 설명 | 범위 |
|--------|------|------|
| D (Density) | 정보 밀도 = min(1, tokens/20) × (1 - repetition_ratio) | 0-1 |
| U (Uniqueness) | 기존 메모리 대비 신규성 = 1 - max_cosine_sim | 0-1 |
| T (Temporal) | 현재 대화=1.0, 과거=e^(-0.1·hours) | 0-1 |
| R (Reliability) | explicit=1.0, tool=0.95, search=0.85, passive=0.50 | 0-1 |
| V (Value) | user_profile=0.9, project=0.85, preference=0.8, general=0.5 | 0-1 |
| S (Stability) | 반복 언급 보정 = min(1, ln(1 + mention_count)) | 0-1 |

### 4.2 Auto-Commit Threshold

```
Score ≥ 0.45 → auto-commit
Score < 0.45 → skip (SSE: SKIPPED)
```

### 4.3 예시 시나리오

| 시나리오 | D | U | T | R | V | S | Score | 결과 |
|---------|---|---|---|---|---|---|-------|------|
| "나 삼성전자 100주 갖고있어" (첫 언급) | 0.6 | 0.9 | 1.0 | 0.5 | 0.9 | 0.0 | 0.59 | SAVED |
| "ㅋㅋ 오케이" | 0.0 | - | - | - | - | - | 0.0 | FILTERED |
| "오늘 날씨 어때" | 0.3 | 0.8 | 1.0 | 0.5 | 0.5 | 0.0 | 0.44 | SKIP |
| "DB는 PostgreSQL로 확정" (2번째 언급) | 0.5 | 0.7 | 1.0 | 0.5 | 0.85 | 0.69 | 0.63 | SAVED |

---

## 5. Decay 시스템

### 5.1 수식 (GPT usage boost 반영)

```
C_new = max(scope_floor, C_old × D_time × B_usage × P_source)

D_time = e^(-ln2/H × t)           // 지수 감쇠
B_usage = min(1.5, 1 + 0.20·ln(1 + access_count))  // 접근 보정 (0.08→0.20)
P_source = { explicit: 1.0, tool: 1.0, search: 0.95, passive: 0.85 }
```

### 5.2 Scope별 반감기

| Scope | 반감기(H) | Floor | 근거 |
|-------|----------|-------|------|
| user_profile | 120일 | 0.20 | 신원 정보 느리게 변함 |
| user_preference | 60일 | 0.15 | 선호도 중간 변동 |
| project_* | 90일 | 0.20 | 설계 결정 준영구 |
| user_research | 45일 | 0.10 | 연구 주제 빠르게 회전 |
| general_knowledge | 30일 | 0.05 | 일반 지식 가장 휘발 |

### 5.3 Archive 기준

```
confidence < 0.10 → is_active = false, archived_reason = 'confidence_decay'
```

### 5.4 Batch SQL (O(N)→O(1) 최적화)

```sql
WITH decay_calc AS (
  SELECT id, scope, confidence, access_count,
    EXTRACT(EPOCH FROM (NOW() - COALESCE(last_accessed_at, updated_at))) / 86400.0 AS idle_days
  FROM memory_records
  WHERE is_active = true AND confidence > 0.10
)
UPDATE memory_records mr SET
  confidence = GREATEST(
    CASE mr.scope
      WHEN 'user_profile' THEN 0.20
      WHEN 'user_preference' THEN 0.15
      WHEN 'project_architecture' THEN 0.20
      WHEN 'project_decision' THEN 0.20
      WHEN 'user_research' THEN 0.10
      ELSE 0.05
    END,
    dc.confidence
      * EXP(-LN(2) / (CASE dc.scope
          WHEN 'user_profile' THEN 120
          WHEN 'user_preference' THEN 60
          WHEN 'project_architecture' THEN 90
          WHEN 'project_decision' THEN 90
          WHEN 'user_research' THEN 45
          ELSE 30
        END) * dc.idle_days)
      * LEAST(1.5, 1 + 0.20 * LN(1 + dc.access_count))
  ),
  updated_at = NOW()
FROM decay_calc dc WHERE mr.id = dc.id;

-- Archive
UPDATE memory_records SET is_active = false, archived_reason = 'confidence_decay'
WHERE is_active = true AND confidence < 0.10;
```

### 5.5 스케줄

PM2 cron: 매일 03:00 KST, `run-memory-decay.ts`

---

## 6. Merge 시스템

### 6.1 Two-Tier 구조 (GPT threshold 반영)

```
sim ≥ 0.90  → DEDUP (하위 삭제, 기존 로직)
0.85 ≤ sim < 0.90  → MERGE (콘텐츠 병합)
sim < 0.85  → NO ACTION
```

### 6.2 Merge Confidence 수식

```
C_merged = min(1.0, C_base + 0.3 × C_other × (1 - similarity))
```

### 6.3 Content Merge 전략 (GPT LLM optional 반영)

```
if (combined_length ≤ 200):
  merged = token_concat(base, unique_tokens_from(other))  // LLM 없음
else:
  merged = LLM_summarize(base, other, max=200)  // Claude Haiku
  fallback = token_concat(...)  // LLM 실패 시
```

### 6.4 스케줄

PM2 cron: 주 1회 (일요일 04:00 KST)

---

## 7. Conflict Detection

### 7.1 탐지 수식

```
Step 1: Pre-filter (fast)
  candidates = memories WHERE same_scope AND cosine_sim(new, existing) ≥ 0.70

Step 2: Negation embedding
  neg_emb = embed("It is NOT true that: " + existing.content)
  contradiction_score = cosine_sim(new, neg_emb) - cosine_sim(new, existing) + 0.5

Step 3: Resolution
  score > 0.75 (strong):
    if new.source ∈ [explicit, tool_verified] → SUPERSEDE
    elif new.confidence > existing.confidence + 0.2 → SUPERSEDE
    else → FLAG_USER (SSE: CONFLICT)

  0.65 < score ≤ 0.75 (weak):
    COEXIST_DOWNGRADE (둘 다 유지, 낮은 쪽 confidence × 0.8)
```

### 7.2 LLM Verification (GPT 추천, optional)

```
if (contradiction_score > 0.65 AND contradiction_score < 0.80):
  // 애매한 영역 — LLM 판정으로 false positive 제거
  llm_verdict = ask_haiku("Do these contradict? A: {a} B: {b}")
  if (llm_verdict === "no") → skip conflict
```

비용: ~$0.0001/건, 하루 ~5건 미만 예상

---

## 8. 임계값 총정리

| 파라미터 | 값 | 용도 |
|---------|-----|------|
| Dedup threshold | ≥ 0.90 | 중복 삭제 |
| Merge threshold | [0.85, 0.90) | 콘텐츠 병합 |
| Conflict pre-filter | ≥ 0.70 | 충돌 후보 |
| Contradiction (strong) | > 0.75 | 대체 |
| Contradiction (weak) | > 0.65 | 공존+약화 |
| Auto-commit score | ≥ 0.45 | 자동 저장 |
| Archive confidence | < 0.10 | 소프트 삭제 |
| Implicit confidence min | ≥ 0.55 | implicit 메모리 저장 |
| Usage boost alpha | 0.20 | Decay 접근 보정 |
| Usage boost cap | 1.5 | Decay 최대 보정 |
| Embedding confirm threshold | ≥ 0.60 | Implicit regex miss 보완 |

---

## 9. 파일 처리 계획

### Salvage (살려서 개선) — 5개
| 파일 | 작업 |
|------|------|
| `memory-decay-engine.ts` | scaffold 유지, 수식 교체, batch SQL |
| `memory-decay-utils.ts` | 파라미터 조정 (alpha 0.20, cap 1.5) |
| `memory-merge.engine.ts` | two-tier + content merge 추가 |
| `memory-confidence-decay.ts` | 수식 교체 |
| `memory-confidence-decay.rule.ts` | scope별 반감기 테이블 |

### Rewrite (완전 재작성) — 2개
| 파일 | 작업 |
|------|------|
| `memory-conflict-detector.ts` | negation embedding 방식 |
| `memory-candidate-score.ts` | 6-factor 가중 모델 |

### New (신규 생성) — 3개
| 파일 | 역할 |
|------|------|
| `memory-pipeline-runner.ts` | chat-engine에서 추출한 통합 파이프라인 |
| `memory-implicit-detector.ts` | regex + embedding implicit 탐지 |
| `memory-implicit-scorer.ts` | implicit 전용 confidence 계산 |

### Delete (삭제) — 37개
Phase 1~3 안정화 후 일괄 삭제.
- `memory-decay.ts` (step function)
- `memory-action.ts`, `memory-ack.ts`, `map-intent-to-action.ts`
- `intent-confidence-scorer.ts`, `memory-commit-engine.ts`
- `memory-short.ts`, `memory-long.ts`, `memory-retriever.ts`
- `memory-policy-resolver.ts`, `memory-vector-utils.ts`
- `memory-auto-commit.rule.ts`, `memory-candidate-rule.ts`, `memory-candidate-score.ts` (rewrite 대체)
- `memory-versioned-update.ts`, `memory-versioning.guard.ts`, `memory-rollback.service.ts`
- `memory-snapshot-diff.ts`, `memory-evolution-analyzer.ts`
- `memory-rule-suggestion.ts`, `memory-rule-suggestion.engine.ts`, `memory-rule-dryrun.engine.ts`
- `runtime/index.ts`, `runtime/memory-rule-resolver.ts`
- `cross/index.ts` (사용처 없음, cross/개별파일은 LIVE)
- `index.ts` (Memory 객체 미사용)
- `repo/memory-records.repo.ts`, `repo/memory-decay.repo.ts`, `repo/memory-drift.repo.ts`
- `repo/memory-rule-apply.repo.ts`, `repo/memory-rule-dryrun.repo.ts`, `repo/memory-snapshot-records.repo.ts`
- `snapshot/memory-snapshot.repo.ts`, `snapshot/memory-snapshot-restore.ts`

---

## 10. 구현 로드맵

### Phase 1: 파이프라인 부활 (최우선)
| # | 작업 | 파일 | 공수 | 위험도 |
|---|------|------|------|--------|
| 1-1 | 스트림 메모리 활성화 (stream end hook) | execution-engine.ts, memory-pipeline-runner.ts (new) | 3-4h | HIGH |
| 1-2 | Auto-commit 게이트 완화 | memory-auto-commit.ts | 30m | LOW |
| 1-3 | Implicit detector 구현 | memory-implicit-detector.ts (new), memory-implicit-scorer.ts (new) | 2-3h | MED |
| 1-4 | SHIFT 턴 + isStorableIntent 게이트 수정 | chat-engine.ts, decision-orchestrator.ts | 1h | LOW |
| 1-5 | 논스트림 경로 동일 적용 | chat-controller.ts | 30m | LOW |

### Phase 2: Decay 연결
| # | 작업 | 파일 | 공수 | 위험도 |
|---|------|------|------|--------|
| 2-1 | Decay 수식 교체 + batch SQL | memory-decay-engine.ts, memory-decay-utils.ts | 2h | LOW |
| 2-2 | access_count 추적 | memory-manager.ts | 1h | LOW |
| 2-3 | PM2 cron 등록 | ecosystem.config.js | 30m | LOW |

### Phase 3: Merge + Conflict
| # | 작업 | 파일 | 공수 | 위험도 |
|---|------|------|------|--------|
| 3-1 | Two-tier merge | memory-merge.engine.ts | 2h | MED |
| 3-2 | Conflict detector 재작성 | memory-conflict-detector.ts | 2-3h | MED |
| 3-3 | Pipeline 연결 (dedup→conflict→commit) | memory-pipeline-runner.ts | 1h | LOW |
| 3-4 | Merge cron 등록 | ecosystem.config.js | 30m | LOW |

### Phase 4: 정리
| # | 작업 | 파일 | 공수 | 위험도 |
|---|------|------|------|--------|
| 4-1 | Candidate scoring 6-factor 교체 | memory-candidate-score.ts | 1h | LOW |
| 4-2 | 37개 데드코드 삭제 | 37 files | 1h | LOW |
| 4-3 | QA 검증 에이전트 투입 | — | 1-2h | — |

**총 공수: ~18-20h (3-4 세션)**

---

## 11. 성공 지표

| 지표 | 현재 | Phase 1 후 | Phase 3 후 |
|------|------|-----------|-----------|
| conversation_summaries 행 수 | 0 | 자동 누적 (구현 완료) | 자동 누적 |
| memory_records 일일 신규 | 0 | 10-30건/유저/일 | 10-30건 |
| 메모리 중복률 | N/A | dedup 작동 | merge 추가 |
| 30일 이상 미접근 메모리 | 삭제 없음 | 삭제 없음 | decay 작동 |
| 맥락 유실 (주식 대화 버그) | 발생 | summary로 완화 | memory로 해결 |

---

## 12. 리스크 + 완화

| 리스크 | 확률 | 영향 | 완화 |
|--------|------|------|------|
| Memory pollution (과다 저장) | MED | 검색 성능 저하 | score ≥ 0.45 gate + decay |
| Embedding API 지연 | LOW | 메모리 저장 지연 | stream end hook (응답 무관) |
| Conflict false positive | MED | 정상 메모리 삭제 | LLM verification (optional) |
| Merge 품질 저하 | LOW | 의미 손실 | token concat default, LLM optional |
| DB 부하 (batch decay) | LOW | 쿼리 지연 | CTE 단일 쿼리, 새벽 3시 실행 |
