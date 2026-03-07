import type { ToolType } from "./tool-types";
import { runVerifierLoop } from "../verifier/verifier-loop";
import { writeFailureSurface } from "../telemetry/failure-surface-writer";
import { runPySolver } from "./py-solver-runner";
import { runDocumentBuilder } from "./document-builder.runner";
import { StreamEngine } from "../engines/stream-engine";


// 🔒 SSOT: Structured Fact Hint (NO INTERPRETATION)
export type MarketSeriesFactHint = {
  kind: "MARKET_SERIES";
  symbol: string;
  market: string;
  source: string | string[];
  granularity: "daily";
  coverage: {
    start?: string;
    end?: string;
  };
  isEstimated?: boolean;
  status?: "OK" | "DELAYED" | "FUTURE" | "NO_DATA" | "ERROR";
  reason?: string | null;
  asOf?: number | null;
  latest?: {
    date?: string;
    fields: {
      open?: number;
      high?: number;
      low?: number;
      close?: number;
      volume?: number;
    };
  };
};


export type TrustedFactHint =
  | MarketSeriesFactHint;
  
export interface ToolRunResult {
  tool: ToolType;
  rawResult: unknown;

  verified: boolean;
  confidence: number;
  verifierReason: string;

  verifierUsed: number;
  verifierFailed: boolean;

  /** 🔥 PHASE 8-5: tool → confidence feedback */
  toolScoreDelta: number;

  toolSucceeded: boolean;
  toolLatencyMs: number;

  ok: boolean;
  result?: unknown;
}

export async function runToolWithVerification(input: {
  threadId: number;
  tool: ToolType;
  payload: unknown;
  baseConfidence: number;
  verifierBudget: number;
  traceId?: string;
}): Promise<ToolRunResult> {
  const start = Date.now();
  const { tool, payload, baseConfidence, verifierBudget, traceId } = input;

  let toolResult: unknown;

  try {
    if (tool === "PY_SOLVER") {
     const domain = (payload as { domain?: string } | null)?.domain;
 if (
   tool === "PY_SOLVER" &&
   !["MATH", "STATISTICS", "PHYSICS", "CHEMISTRY"].includes(String(domain))
 ) {
    return {
      tool,
      rawResult: null,
      verified: false,
      confidence: baseConfidence,
      verifierReason: "non_math_input",
      verifierUsed: 0,
      verifierFailed: false,
      toolScoreDelta: 0,
      toolSucceeded: false,
      toolLatencyMs: 0,
      ok: false,
    };
  }
    console.log("[RUN_TOOL][PY_SOLVER][ENTER]", {
        traceId,
        payload,
      });
      toolResult = await runPySolver({
        traceId: traceId ?? crypto.randomUUID(),
        ...(payload as any),
            });

            } else if (tool === "MARKET_DATA") {
            console.log("[RUN_TOOL][MARKET_DATA][ENTER]", {
        traceId,
        payload,
      });
  toolResult = await runPySolver({
    traceId: traceId ?? crypto.randomUUID(),
    ...(payload as any),
  });
    } else if (tool === "DOCUMENT_BUILDER") {
      toolResult = await runDocumentBuilder({
        traceId: traceId ?? crypto.randomUUID(),
        ...(payload as any),
      });
    } else {
      throw new Error(`Unsupported tool: ${tool}`);
    }
  } catch (err) {
    writeFailureSurface({
      traceId: traceId ?? crypto.randomUUID(),
      path: String(tool),
      phase: "tool",
      failureKind: "TOOL_FAIL",
      surfaceKey: `TOOL:${tool}`,
      relatedPayload: { error: String(err) },
    });

    toolResult = { ok: false, error: String(err) };
  }

  const verifier = await runVerifierLoop({
    tool,
    toolResult,
    baseConfidence,
    budget: verifierBudget,
  });

    // 🔥 SSOT: PY_SOLVER ok=true → 최소 통과 보장
  if (
    (tool === "PY_SOLVER" || tool === "MARKET_DATA") &&
    typeof toolResult === "object" &&
    toolResult !== null &&
    "ok" in toolResult &&
    (toolResult as any).ok === true
  ) {
    verifier.passed = true;
    verifier.confidence = Math.max(verifier.confidence, baseConfidence);
  }

  const result: ToolRunResult = {
    tool,
    rawResult: toolResult,

    verified: verifier.passed,
    confidence: verifier.confidence,
    verifierReason: verifier.reason,

    verifierUsed: verifier.verifierUsed,
    verifierFailed: verifier.verifierFailed,

    toolScoreDelta: verifier.toolScoreDelta,

    toolSucceeded: verifier.passed,
    toolLatencyMs: Date.now() - start,

    ok: verifier.passed,
    result: verifier.passed ? toolResult : undefined,
  };
  // 🔒 SSOT: expose tool result to ExecutionEngine
  StreamEngine.setLastToolResult(input.threadId, {
    tool,
    result: result.result,
    confidence: result.confidence,
  });

  return result;
}
