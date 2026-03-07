// 📂 src/ai/response/verdict-adapter.ts
// 🔒 YUA Verdict → ResponseState Adapter
// SSOT PHASE 2 FINAL (2026.01)
//
// 책임:
// - Core 판단 결과를 ResponseState로 단일 매핑
// - CoreVerdict / DecisionVerdict 수정 ❌
// - Always Respond 보장
// - 침묵 ❌
//
// ⚠️ 이 파일은 "봉인 어댑터"다.
// 기존 Judgment / Activation / Silence 로직을 침범하지 않는다.

import type {
  DecisionResult,
  DecisionVerdict,
} from "../../types/decision";

import type {
  ResponseState,
} from "./response-types";

/* --------------------------------------------------
 * 🔒 SSOT Mapping Rules (FIXED)
 * --------------------------------------------------
 *
 * DecisionVerdict → ResponseState
 *
 * APPROVE → APPROVE
 * HOLD    → UNCERTAIN
 * REJECT  → BLOCK
 *
 * - confidence는 여기서 해석하지 않는다
 * - 판단의 의미를 "표현 상태"로만 번역
 * - Always Respond 유지
 * -------------------------------------------------- */

/**
 * Core Verdict → ResponseState
 * ❌ silence
 * ❌ null
 * ❌ optional
 */
export function mapVerdictToResponseState(
  verdict: DecisionVerdict
): ResponseState {
  switch (verdict) {
    case "APPROVE":
      return "APPROVE";

    case "HOLD":
      return "UNCERTAIN";

    case "REJECT":
      return "BLOCK";

    default: {
      /**
       * 🔒 SSOT Safety Net
       * - 새로운 verdict가 추가되더라도
       * - 시스템은 절대 침묵하지 않는다
       */
      return "UNCERTAIN";
    }
  }
}

/* --------------------------------------------------
 * Convenience Adapter
 * --------------------------------------------------
 * Controller / Engine에서 바로 사용 가능
 */

export function adaptDecisionToResponseState(
  decision: DecisionResult
): ResponseState {
  return mapVerdictToResponseState(decision.verdict);
}
