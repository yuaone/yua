import type { ReasoningResult } from "../reasoning/reasoning-engine";
import type { ExecutionResult } from "../execution/execution-result";
import type {
  CompletionVerdict,
  CompletionVerdictReason,
} from "./completion-verdict";

export const CompletionVerdictEngine = {
  evaluate(params: {
    reasoning: ReasoningResult;
    executionResult?: ExecutionResult;
    answerText?: string;
  }): {
    verdict: CompletionVerdict;
    reason: CompletionVerdictReason;
  } {
    const { reasoning, executionResult, answerText } = params;

    // 1️⃣ 실행 실패 → FAIL
    if (executionResult && executionResult.ok === false) {
      return { verdict: "FAIL", reason: "UNKNOWN" };
    }

    // 2️⃣ reasoning confidence 낮음
    if (reasoning.confidence < 0.45) {
      return { verdict: "WEAK", reason: "LOW_CONFIDENCE" };
    }

    // 3️⃣ 답변 너무 짧음 → 미완
    if (answerText && answerText.trim().length < 40) {
      return { verdict: "WEAK", reason: "INCOMPLETE" };
    }

    return { verdict: "PASS", reason: "UNKNOWN" };
  },
};
