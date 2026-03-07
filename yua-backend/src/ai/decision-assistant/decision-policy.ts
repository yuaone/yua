import type { DecisionInputContext } from "./decision-input-context";
import type { DecisionResult } from "./decision-result";

/**
 * 🔒 Rule-First Decision Policy (SSOT)
 */
export function applyDecisionPolicy(
  ctx: DecisionInputContext
): DecisionResult | null {
  const now = Date.now();

  // 1) 과도한 입력
  if (ctx.contentLength > 50_000) {
    return {
      verdict: "HOLD",
      confidence: 0.95,
      riskLevel: "HIGH",
      reasons: ["입력 크기가 커서 판단이 어려워요."],
      requiredActions: ["내용을 나눠서 다시 요청해 주세요."],
      timestamp: now,
      decidedBy: "RULE",
    };
  }

  // 2) 문서 + 코드
  if (ctx.decisionDomain === "DOCUMENT" && ctx.hasCodeBlock) {
    return {
      verdict: "HOLD",
      confidence: 0.82,
      riskLevel: "MEDIUM",
      reasons: ["문서에 코드가 섞여 있어요."],
      requiredActions: ["문서와 코드를 분리해 주세요."],
      timestamp: now,
      decidedBy: "RULE",
    };
  }

  // 3) 코드 + 민감
  if (ctx.decisionDomain === "CODE" && ctx.hasSensitiveKeyword) {
    return {
      verdict: "REJECT",
      confidence: 0.9,
      riskLevel: "HIGH",
      reasons: ["고위험 코드 요청이에요."],
      requiredActions: ["안전한 대안으로 설명해 주세요."],
      timestamp: now,
      decidedBy: "RULE",
    };
  }

  // 4) 안전한 기본 승인
  if (!ctx.hasSensitiveKeyword && ctx.contentLength < 2_000) {
    return {
      verdict: "APPROVE",
      confidence: 0.72,
      riskLevel: "LOW",
      reasons: ["위험 신호가 낮아요."],
      requiredActions: ["진행할게요."],
      timestamp: now,
      decidedBy: "RULE",
    };
  }

  return null;
}
