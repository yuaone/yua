import { runLitePipeline } from "../lite/pipeline-lite";
import { decidePath } from "../../routes/path-router";
import { scheduleReasoning } from "../scheduler/reasoning-scheduler";
import { ReasoningEngine } from "../reasoning/reasoning-engine";
import { detectMemoryIntent } from "../memory/memory-intent";
import { judgmentRegistry } from "../judgment/judgment-singletons";
import type { JudgmentInput } from "../judgment/judgment-input";
import type { DecisionResult } from "../../types/decision";

export type DecisionContext = {
  sanitizedMessage: string;
  path: string;
  reasoning: any;
  memoryIntent: string;
  decision: DecisionResult;
};

export async function runDecisionPipeline(
  message: string,
  personaMeta: any,
  traceId: string
): Promise<DecisionContext> {
  const lite = await runLitePipeline(message);

const sanitizedMessage =
  lite.cleaned && lite.cleaned.trim().length > 0
    ? lite.cleaned
    : message;

  const basePath = decidePath({
    content: sanitizedMessage,
    source: "USER",
    traceId,
    receivedAt: Date.now(),
  });

  const schedule = scheduleReasoning({
    basePath,
  });

  const judgmentInput: JudgmentInput = {
    path: schedule.finalPath,
    persona: personaMeta,
    traceId,
    rawInput: sanitizedMessage,
  };

  const decision = await judgmentRegistry.evaluate(judgmentInput);

  const reasoning = ReasoningEngine.reason({
    input: sanitizedMessage,
  });

  const memoryIntent = detectMemoryIntent(message);

  return {
    sanitizedMessage,
    path: schedule.finalPath,
    reasoning,
    memoryIntent,
    decision,
  };
}
