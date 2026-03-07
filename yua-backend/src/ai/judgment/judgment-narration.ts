// 🔒 STEP 5 — Judgment Narration Generator (FINAL)

import type { FormattedJudgmentResult } from "./judgment-result-formatter";

export function generateJudgmentNarration(
  result: FormattedJudgmentResult
): string {
  switch (result.verdict) {
    case "APPROVE":
      return "요청을 정상적으로 진행할 수 있어.";

    case "HOLD":
      return "지금은 추가 확인이 필요해. 조금 더 살펴보는 게 좋아.";

    case "REJECT":
    default:
      return "이 요청은 현재 조건에서는 진행하기 어려워.";
  }
}
