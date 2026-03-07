// 🔒 DESIGN Engine — GPT-5.2 Pro Class Reasoning (SSOT FINAL)

import { ChatEngine } from "./chat-engine";
import type { ChatMeta } from "./chat-engine";
import { OUTMODE } from "../chat/types/outmode";
import { buildToolExecutionPlan } from "../tools/tool-plan-builder";
import { runVerifierLoop } from "../verifier/verifier-loop";
import type { ToolRunResult } from "../tools/tool-runner";
import type { YuaExecutionPlan } from "yua-shared";
import { dispatchYuaExecutionPlan } from "../yua-tools/yua-tool-dispatcher";
import type { YuaStreamEvent } from "../../types/stream";
import { ContinuationSuggestionEngine } from "../suggestion/continuation-suggestion-engine";
import { PathType } from "../../routes/path-router";

export class DesignEngine {
  static async run(
    input: string,
    persona: { role: string },
    meta: ChatMeta
  ) {
    const traceId = meta.traceId!;
    const threadId = meta.threadId!;
    const toolGate = meta.toolGate;
    const workspaceId = meta.workspaceId;

    let accumulatedFacts: string[] = [];
    let verifierFailures = 0;

    /* -------------------------------------------------- */
    /* 🔁 Tool + Verifier Loop (MAX 3)                     */
    /* -------------------------------------------------- */
    if (toolGate && toolGate.toolLevel !== "NONE") {
      if (!workspaceId) {
        throw new Error("WORKSPACE_ID_REQUIRED_FOR_TOOL_EXECUTION");
      }
      const resolvedPath: PathType = "NORMAL";

      const plan = buildToolExecutionPlan({
        message: input,
        path: resolvedPath,
        toolGate,
        executionTask: toolGate.executionTask,
      });

      for (const item of plan.items.slice(0, 3)) {
        const yuaPlan = toYuaExecutionPlan(item);
        const { result: yuaResult } = await dispatchYuaExecutionPlan(
          yuaPlan as unknown as YuaExecutionPlan,
          {
            traceId,
            workspaceId,
            threadId,
          }
        );

        const toolResultForVerifier =
          (yuaResult as any)?.output ?? yuaResult;

        const verifier = await runVerifierLoop({
          tool: item.tool,
          toolResult: toolResultForVerifier,
          baseConfidence: toolGate.toolScore,
          budget: toolGate.verifierBudget,
        });

        const result: ToolRunResult = {
          tool: item.tool,
          rawResult: toolResultForVerifier,
          verified: verifier.passed,
          confidence: verifier.confidence,
          verifierReason: verifier.reason,
          verifierUsed: verifier.verifierUsed,
          verifierFailed: verifier.verifierFailed,
          toolScoreDelta: verifier.toolScoreDelta,
          toolSucceeded: verifier.passed,
          toolLatencyMs: 0,
          ok: verifier.passed,
          result: verifier.passed ? toolResultForVerifier : undefined,
        };

        if (result.verified && result.rawResult !== undefined) {
          accumulatedFacts.push(
            `[Verified:${item.tool}] ${String(result.rawResult)}`
          );
        } else {
          verifierFailures++;

          // 🔒 DESIGN ENGINE: narration / stream 제거
          // 실패는 내부 상태로만 반영
        }

        if (verifierFailures >= 2) break;
      }
    }

    /* -------------------------------------------------- */
    /* 🧠 Context 재구성                                  */
    /* -------------------------------------------------- */
    const finalInput =
      accumulatedFacts.length > 0
        ? `${input}\n\n${accumulatedFacts.join("\n")}`
        : input;

    /* -------------------------------------------------- */
    /* 🚀 ChatEngine 호출 (DEEP 강제)                     */
    /* -------------------------------------------------- */
    return ChatEngine.generateResponse(finalInput, persona, {
      ...meta,
      outmode: OUTMODE.DEEP,
      stream: true,
    });
  }
}

function toYuaExecutionPlan(item: import("../tools/tool-plan-builder").ToolPlanItem) {
  switch (item.tool) {
    case "PY_SOLVER":
      return { task: "PY_SOLVER", payload: item.payload };
    case "MARKET_DATA":
      return { task: "MARKET_DATA", payload: item.payload };
    case "WEB_FETCH":
      return { task: "WEB_FETCH", payload: item.payload };
    case "DOCUMENT_BUILDER":
      return { task: "FILE_ANALYSIS", payload: item.payload };
    default:
      return { task: item.tool, payload: item.payload };
  }
}
