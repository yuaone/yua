// 🔁 YUA SelfCorrectionEngine — SSOT FINAL (2026.01)

import type { FailureSurface } from "./failure-surface-engine";
import type { CompletionDecision } from "../conversation/completion-policy";
import type { ReasoningResult } from "../reasoning/reasoning-engine";

export type SelfCorrectionAction =
  | "NONE"
  | "REDUCE_CONFIDENCE"
  | "REDUCE_DEPTH"
  | "FORCE_VERIFY"
  | "SLOW_DOWN";

type Input = {
  reasoning: ReasoningResult;
  completion: CompletionDecision;
  failureSurface?: FailureSurface;
};

export const SelfCorrectionEngine = {
  decide(input: Input): SelfCorrectionAction {
    const { reasoning, completion, failureSurface } = input;

    if (failureSurface?.risk === "HIGH") {
      return "REDUCE_CONFIDENCE";
    }

    if (
      completion.status === "INCOMPLETE" &&
      completion.reason === "LOW_CONFIDENCE"
    ) {
      return "REDUCE_CONFIDENCE"; // 🔒 톤만 조절
    }

    if (
      reasoning.intent === "decide" &&
      reasoning.depthHint === "shallow" &&
      reasoning.confidence > 0.7
    ) {
      return "FORCE_VERIFY";
    }

    return "NONE";
  },
};
