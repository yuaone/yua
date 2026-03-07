import type { ToolType } from "../tools/tool-types";

export interface VerifierResult {
  passed: boolean;
  confidence: number;
  remainingBudget: number;

  verifierUsed: number;
  verifierFailed: boolean;

  /** 🔥 PHASE 8-5 */
  toolScoreDelta: number;

  reason: string;
}

export async function runVerifierLoop(input: {
  tool: ToolType;
  toolResult: unknown;
  baseConfidence: number;
  budget: number;
}): Promise<VerifierResult> {
  let { baseConfidence, budget } = input;

  if (budget <= 0) {
    return {
      passed: false,
      confidence: baseConfidence,
      remainingBudget: 0,
      verifierUsed: 0,
      verifierFailed: true,
      toolScoreDelta: -0.2,
      reason: "verifier_budget_exhausted",
    };
  }

  let passed = false;
  let delta = 0;
  let toolScoreDelta = 0;

  switch (input.tool) {
    case "PY_SOLVER": {
      const ok =
        typeof input.toolResult === "object" &&
        (input.toolResult as any)?.ok === true &&
        (input.toolResult as any)?.result;

      passed = !!ok;

      delta = passed ? +0.12 : -0.25;
      toolScoreDelta = passed ? +0.3 : -0.5;
      break;
    }

        case "MARKET_DATA": {
      const ok =
        typeof input.toolResult === "object" &&
        (input.toolResult as any)?.ok === true;

      passed = !!ok;
      delta = passed ? +0.12 : -0.25;
      toolScoreDelta = passed ? +0.3 : -0.5;
      break;
    }

    case "DOCUMENT_BUILDER": {
  const ok =
    typeof input.toolResult === "object" &&
    (input.toolResult as any)?.sections?.length > 0;

  passed = !!ok;
  delta = passed ? +0.08 : -0.2;
  toolScoreDelta = passed ? +0.25 : -0.4;
  break;
}

    default:
      passed = false;
      delta = -0.05;
      toolScoreDelta = -0.1;
  }

  const confidence = Math.max(
    0,
    Math.min(1, baseConfidence + delta)
  );

  return {
    passed,
    confidence,
    remainingBudget: budget - 1,
    verifierUsed: 1,
    verifierFailed: !passed,
    toolScoreDelta,
    reason: passed ? "verifier_passed" : "verifier_failed",
  };
}
