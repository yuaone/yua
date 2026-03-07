// 🔒 STEP 5 — Judgment Result Formatter (FINAL)

import type { DecisionResult } from "../../types/decision";

export interface FormattedJudgmentResult {
  /**
   * 사용자에게 노출 가능한 최종 상태
   */
  verdict: "APPROVE" | "HOLD" | "REJECT";

  /**
   * narration 생성을 위한 힌트
   * (판단 로직과 무관)
   */
  tone: "positive" | "neutral" | "cautious";
}

export function formatJudgmentResult(
  result: DecisionResult
): FormattedJudgmentResult {
  switch (result.verdict) {
    case "APPROVE":
      return {
        verdict: "APPROVE",
        tone: "positive",
      };

    case "HOLD":
      return {
        verdict: "HOLD",
        tone: "cautious",
      };

    case "REJECT":
    default:
      return {
        verdict: "REJECT",
        tone: "neutral",
      };
  }
}
