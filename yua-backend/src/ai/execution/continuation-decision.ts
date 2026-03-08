// 📂 src/ai/execution/continuation-decision.ts
// 🔥 SSOT: Execution continuation 판단 단일 진실

export type ContinuationDecision =
  | { type: "CONTINUE_LLM" }
  | { type: "RUN_TOOL" }
  | { type: "FINISH"; reason: string };

export function decideContinuation(args: {
  segmentIndex: number;
  receivedAnyToken: boolean;
  tokenOverflow: boolean;
  turnIntent?: string;
  nextAnchors?: string[];
  allowContinuation: boolean;
  previousAnswerTail?: string;
  disallowContinuation?: boolean;
  isShallow: boolean;
  segmentTokenCount: number;
  accumulatedConfidenceDelta?: number;
  remainingVerifierBudget?: number;
  thinkingProfile?: "FAST" | "NORMAL" | "DEEP";
}): ContinuationDecision {
 // 🔒 SSOT: explicit block
  if (args.disallowContinuation === true) {
    return {
      type: "FINISH",
      reason: "EXPLICIT_CONTINUATION_BLOCK",
    };
  }
  if (args.remainingVerifierBudget === 0) {
    return {
      type: "FINISH",
      reason: "VERIFIER_BUDGET_EXHAUSTED",
    };
  }

  if (
    typeof args.accumulatedConfidenceDelta === "number" &&
    args.accumulatedConfidenceDelta < -0.6
  ) {
    return {
      type: "FINISH",
      reason: "CONFIDENCE_COLLAPSE",
    };
  }
 // 🔥 Low confidence slowdown
  if (
    typeof args.accumulatedConfidenceDelta === "number" &&
    args.accumulatedConfidenceDelta < -0.25 &&
    args.segmentIndex >= 1
  ) {
    return {
      type: "FINISH",
      reason: "CONFIDENCE_DECAY_EARLY_EXIT",
    };
  }
 if (!args.allowContinuation) {
    return { type: "FINISH", reason: "CONTINUATION_NOT_ALLOWED" };
  }

  if (args.isShallow && args.segmentTokenCount >= 400) {
    return { type: "FINISH", reason: "FAST_EARLY_EXIT" };
  }
  // 1️⃣ 완전 무응답 → 종료
  if (!args.receivedAnyToken && args.segmentIndex > 0) {
    return { type: "FINISH", reason: "NO_OUTPUT" };
  }

  // 2️⃣ 질문 턴 + 토큰 오버플로우 → 종료
  if (args.tokenOverflow && args.turnIntent === "QUESTION") {
    return { type: "FINISH", reason: "TOKEN_OVERFLOW_QUESTION" };
  }

  if (args.nextAnchors?.includes("IMPLEMENT")) {
    return { type: "RUN_TOOL" };
  }

  // 4️⃣ 기본: 계속 LLM
  if (
    typeof args.accumulatedConfidenceDelta === "number" &&
    args.accumulatedConfidenceDelta > 0.15
  ) {
    return { type: "CONTINUE_LLM" };
  }

  const isDeep =
    (args as any).thinkingProfile === "DEEP";

  // NORMAL: 최소 2 segments 허용 (1 segment에서 조기 종료 방지)
  if (!isDeep && args.segmentIndex >= 2) {
    return { type: "FINISH", reason: "CONFIDENCE_STABLE_EXIT" };
  }

  // DEEP: 최소 3 segments 허용
  if (isDeep && args.segmentIndex >= 3) {
    return { type: "FINISH", reason: "DEEP_SEGMENT_LIMIT_REACHED" };
  }

  return { type: "CONTINUE_LLM" };
}
