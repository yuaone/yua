// 📂 src/ai/tools/tool-gate.ts
// 🔒 Tool Gate Decision — STABLE SAFE

import type { ToolGateSignals, ToolGateDecision } from "./tool-types";
import { routeToolConfidence } from "./confidence-router";

export function decideToolGate(
  sig: ToolGateSignals & { toolScore?: number }
): ToolGateDecision {

  /* ==================================================
   🔥 SEARCH INTENT OVERRIDE — PRIORITY RETURN
   ================================================== */
  if (sig.hasSearchIntent) {
    return {
      toolLevel: "SEARCH_MINIMUM",
      allowedTools: ["OPENAI_WEB_SEARCH", "OPENAI_WEB_FETCH"],
      executionTask: "SEARCH",
      verifierBudget: 1,
      toolScore: sig.toolScore ?? 0,
      reason: "search_intent_override",
      visionBudget: {
        allowOCR: false,
        allowCrop: true,
        allowZoom: true,
        maxImages: 2,
      },
    };
  }

  let baseDecision: ToolGateDecision;

  try {
    baseDecision = routeToolConfidence(sig);
  } catch (err) {
    console.error("[TOOL_GATE][ROUTE_FAIL]", err);

    baseDecision = {
      toolLevel: "NONE",
      allowedTools: [],
      executionTask: sig.executionTask,
      verifierBudget: 0,
      toolScore: 0,
      reason: "route_fail_fallback",
    };
  }

  const toolScore = Math.max(-1, Math.min(1, sig.toolScore ?? 0));

  const verifierBudget = Math.max(
    0,
    Math.round(
      baseDecision.verifierBudget *
        (1 + toolScore * 0.5) *
        (1 - sig.risk)
    )
  );

  // Auto-allow code_interpreter when math/scientific/code patterns detected
  const allowedTools = [...baseDecision.allowedTools];
  if (
    (sig.hasMathExpression || sig.hasScientificPattern || sig.hasCodeBlock) &&
    !allowedTools.includes("OPENAI_CODE_INTERPRETER" as any)
  ) {
    allowedTools.push("OPENAI_CODE_INTERPRETER" as any);
  }

  return {
    ...baseDecision,
    allowedTools,
    toolScore,
    verifierBudget,
    reason: `${baseDecision.reason}|tool_score=${toolScore.toFixed(2)}`,
    visionBudget: {
      allowOCR: sig.hasCodeBlock || sig.hasEventPattern,
      allowCrop: true,
      allowZoom: true,
      maxImages: 2,
    },
  };
}