// 🔒 Claim Boundary Checker — PHASE 6 (SSOT)
// ----------------------------------------
// ✔ LLM 출력 검사
// ✔ 단정/확정 표현 감지
// ✔ 판단 없음 (signal only)

export type ClaimBoundary =
  | "CANNOT_ASSERT"
  | "CAN_SUGGEST"
  | "CAN_ASSERT";

const STRONG_ASSERT_PATTERNS = [
  /명확하다/,
  /확정/,
  /사실이다/,
  /틀림없/,
  /반드시/,
  /100%/,
];

export function checkClaimBoundaryViolation(args: {
  text: string;
  boundary?: ClaimBoundary;
}): {
  violated: boolean;
  reason?: string;
} {
  const { text, boundary } = args;

  if (!boundary || boundary === "CAN_ASSERT") {
    return { violated: false };
  }

  const hasStrongAssert = STRONG_ASSERT_PATTERNS.some((r) =>
    r.test(text)
  );

  if (boundary === "CANNOT_ASSERT" && hasStrongAssert) {
    return {
      violated: true,
      reason: "strong_assertion_detected",
    };
  }

  if (boundary === "CAN_SUGGEST" && hasStrongAssert) {
    return {
      violated: true,
      reason: "assertion_exceeds_suggestion_level",
    };
  }

  return { violated: false };
}
