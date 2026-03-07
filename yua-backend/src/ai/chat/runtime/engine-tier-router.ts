// src/ai/chat/runtime/engine-tier-router.ts
import type { ToolGateDecision } from "../../tools/tool-types";
import type { EngineTier } from "../types/engine-tier";

export function resolveEngineTier(
  gate: ToolGateDecision
): EngineTier {
  const { toolLevel, toolScore } = gate;

  if (toolLevel === "NONE") return "LITE";

  if (toolLevel === "LIMITED") {
    return toolScore >= 0.45 ? "CORE" : "LITE";
  }

  // FULL
  return toolScore >= 0.6 ? "DESIGN" : "CORE";
}
