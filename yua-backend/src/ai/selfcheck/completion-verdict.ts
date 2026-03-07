// 🔒 SSOT — Completion Verdict (READ-ONLY SIGNAL)
// - Completion 결과에 대한 사후 평가
// - Decision에 직접 영향 ❌
// - 다음 턴 FailureSurfaceAggregate에서만 사용

export type CompletionVerdict = "PASS" | "WEAK" | "FAIL";

export type CompletionVerdictReason =
  | "INCOMPLETE"
  | "LOW_CONFIDENCE"
  | "SELF_CORRECTED"
  | "CLAIM_VIOLATION"
  | "UNKNOWN";
