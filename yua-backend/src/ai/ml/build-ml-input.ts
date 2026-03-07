import type { DecisionContext } from "../decision-assistant/decision-context";
import type { MLInput } from "./ml-input";

/**
 * 🔒 MLInput Builder (SSOT)
 * - Rule / Judgment 이후
 * - DecisionContext만 신뢰
 * - 파생값은 여기서 계산
 */
export function buildMLInput(params: {
  ctx: DecisionContext;
  confidenceHint?: number;
  retryCount?: number;
}): MLInput {
  const { ctx } = params;

  return {
    domain: ctx.decisionDomain,
    contentLength: ctx.sanitizedMessage.length,

    path: ctx.path,
    baseConfidence: ctx.anchorConfidence,

    confidenceHint: params.confidenceHint ?? 0,
    retryCount: params.retryCount ?? 0,
  };
}
