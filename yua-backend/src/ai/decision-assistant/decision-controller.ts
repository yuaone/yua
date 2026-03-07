import type { RawDecisionInput } from "./decision-input";
import type { DecisionContext } from "./decision-context";

import { buildDecisionInputContext } from "./decision-input";
import { applyDecisionPolicy } from "./decision-policy";
import { logDecision } from "./decision-logger";

import { buildToolGateSignals } from "../tools/tool-gate-signal-builder";
import { decideToolGate } from "../tools/tool-gate";
import { buildToolExecutionPlan } from "../tools/tool-plan-builder";

export function runDecisionController(
  input: RawDecisionInput
): {
  decisionContext: DecisionContext;
  toolPlan?: ReturnType<typeof buildToolExecutionPlan>;
} {
  /* ---------------------------
   * 1️⃣ Input → InputContext
   * --------------------------- */
  const inputCtx = buildDecisionInputContext(input);

  /* ---------------------------
   * 2️⃣ Rule Decision
   * --------------------------- */
  const decision =
    applyDecisionPolicy(inputCtx) ?? {
      verdict: "APPROVE",
      confidence: 0.5,
      riskLevel: "LOW",
      reasons: [],
      requiredActions: [],
      timestamp: Date.now(),
      decidedBy: "RULE",
    };

  logDecision(inputCtx, decision);

  /* ---------------------------
   * 3️⃣ ToolGate Signals
   * --------------------------- */
  const toolGateSignals = buildToolGateSignals({
    inputContext: inputCtx,
    content: input.content, // ✅ 실제 사용자 입력
    anchorConfidence: decision.confidence,
  });

  /* ---------------------------
   * 4️⃣ ToolGate Decision
   * --------------------------- */
  const toolGate = decideToolGate(toolGateSignals);

  /* ---------------------------
   * 5️⃣ Tool Execution Plan
   * --------------------------- */
  const toolPlan =
    toolGate.toolLevel === "NONE"
      ? undefined
      : buildToolExecutionPlan({
          message: input.content,
          path: inputCtx.suggestedPath,
          toolGate,
        });

  /* ---------------------------
   * 6️⃣ Final DecisionContext (SSOT)
   * --------------------------- */
  const decisionContext: DecisionContext = {
    sanitizedMessage: input.content,
    decisionDomain: inputCtx.decisionDomain,
    path: inputCtx.suggestedPath,

    decision,
    anchorConfidence: decision.confidence,

    toolGate,

    traceId: crypto.randomUUID(),
    threadId: input.threadId,
  };

  return { decisionContext, toolPlan };
}
