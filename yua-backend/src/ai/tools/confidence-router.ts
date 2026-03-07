// 📂 src/ai/tools/confidence-router.ts
// 🔒 Confidence Router (PHASE 8 FINAL — STABLE)

import type { PathType } from "../../routes/path-router";
import type {
  ToolGateSignals,
  ToolGateDecision,
  ToolType,
  ToolLevel,
} from "./tool-types";
import { getAccumulatedToolScore } from "./tool-score-accumulator";

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function pathDepthPenalty(path: PathType): number {
  switch (path) {
    case "FAST": return 0.0;
    case "NORMAL": return 0.1;
    case "SEARCH": return 0.15;
    case "DEEP": return 0.2;
    case "RESEARCH": return 0.25;
    default: return 0.15;
  }
}

export function routeToolConfidence(
  sig: ToolGateSignals & { traceId?: string }
): ToolGateDecision {

  const baseC = clamp01(sig.baseConfidence);
  const R = clamp01(sig.risk);
  const D = pathDepthPenalty(sig.path);

  const toolFeedback =
    sig.traceId
      ? getAccumulatedToolScore(sig.traceId)
      : 0;

  const effectiveConfidence = clamp01(
    baseC + toolFeedback * 0.25
  );

  const toolScore = clamp01(
    effectiveConfidence - (0.85 * R) - D
  );

  let toolLevel: ToolLevel =
    toolScore < 0.15 ? "NONE" :
    toolScore < 0.45 ? "LIMITED" :
    "FULL";

  /* --------------------------------------------------
   * SEARCH Path Safeguard
   -------------------------------------------------- */
  if (sig.path === "SEARCH" && toolLevel === "NONE") {
    toolLevel = "LIMITED";
  }

  const verifierBudget =
    toolLevel === "NONE" ? 0 :
    toolLevel === "LIMITED"
      ? (R > 0.4 ? 2 : 1)
      : (R > 0.6 ? 2 : 1);

  const allowedSet = new Set<ToolType>();

  if (toolLevel !== "NONE") {
    allowedSet.add("PY_SOLVER");
  }

  if (sig.executionTask === "SEARCH") {
    if (toolLevel === "NONE") {
      toolLevel = "LIMITED";
    }
    allowedSet.add("OPENAI_WEB_SEARCH");
    allowedSet.add("OPENAI_WEB_FETCH");
  }

  if (toolLevel !== "NONE" && sig.executionTask) {
    switch (sig.executionTask) {
      case "FILE_ANALYSIS":
      case "TABLE_EXTRACTION":
      case "DATA_TRANSFORM":
        allowedSet.add("DOCUMENT_BUILDER");
        break;

      case "SEARCH_VERIFY":
        allowedSet.add("OPENAI_WEB_FETCH");
        break;

      case "IMAGE_ANALYSIS":
        allowedSet.add("PY_SOLVER");
        break;

      case "MARKET_DATA":
        allowedSet.add("MARKET_DATA");
        break;
    }
  }

  if (sig.hasUrl) {
    allowedSet.add("OPENAI_WEB_FETCH");
  }

  if (
    toolLevel === "FULL" &&
    sig.domain === "CODE" &&
    !sig.hasSensitiveKeyword
  ) {
    allowedSet.add("CODE_SANDBOX");
  }

  return {
    toolLevel,
    allowedTools: Array.from(allowedSet),
    executionTask: sig.executionTask,
    verifierBudget,
    toolScore,
    reason:
      `C=${baseC.toFixed(2)}` +
      ` TF=${toolFeedback.toFixed(2)}` +
      ` R=${R.toFixed(2)}` +
      ` D=${D.toFixed(2)}` +
      ` score=${toolScore.toFixed(2)}` +
      ` level=${toolLevel}`,
  };
}