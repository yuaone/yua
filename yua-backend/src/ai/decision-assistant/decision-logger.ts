import type { DecisionInputContext } from "./decision-input-context";
import type { DecisionResult } from "./decision-result";

/**
 * 🔒 Decision Logger (SSOT)
 * - 운영 로그 최소화
 * - 원문 ❌
 */
export function logDecision(
  ctx: DecisionInputContext,
  result: DecisionResult
): void {
  const payload = {
    threadId: ctx.threadId ?? null,
    decisionDomain: ctx.decisionDomain,
    suggestedPath: ctx.suggestedPath,
    verdict: result.verdict,
    riskLevel: result.riskLevel,
    confidence: result.confidence,
    decidedBy: result.decidedBy,
    timestamp: result.timestamp,
  };

  console.info("[DECISION_LOG]", JSON.stringify(payload));
}
