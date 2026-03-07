// 🔒 PHASE 15 Adjustment Effect Evaluator (SSOT)
// ---------------------------------------------
// - BEFORE / AFTER 비교
// - 판단: KEEP / ROLLBACK / FREEZE
// - Rule / Learning / Memory 직접 변경 ❌

import type { EffectSnapshot } from "./runtime-effect-snapshot";

export type AdjustmentVerdict =
  | "KEEP"
  | "ROLLBACK"
  | "FREEZE";

export const AdjustmentEffectEvaluator = {
  evaluate(params: {
    before: EffectSnapshot | null;
    after: EffectSnapshot | null;
  }): {
    verdict: AdjustmentVerdict;
    reason: string;
    metrics: Record<string, any>;
  } {
    const { before, after } = params;

    if (!before || !after) {
      return {
        verdict: "FREEZE",
        reason: "insufficient_samples",
        metrics: { before, after },
      };
    }

    // 🔻 실패율 증가 → 즉시 롤백
    if (
      after.verifierFailureRate >
      before.verifierFailureRate + 0.05
    ) {
      return {
        verdict: "ROLLBACK",
        reason: "verifier_failure_increased",
        metrics: { before, after },
      };
    }

    // 🔻 HOLD 비율 급증 → 롤백
    if (after.holdRate > before.holdRate + 0.1) {
      return {
        verdict: "ROLLBACK",
        reason: "hold_rate_spike",
        metrics: { before, after },
      };
    }

    // ✅ 안정화 또는 개선
    return {
      verdict: "KEEP",
      reason: "metrics_stable_or_improved",
      metrics: { before, after },
    };
  },
};
