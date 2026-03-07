import type { DecisionContext } from "../decision/decision-context.types";
import type { DesignHint, DesignStage } from "./design-hint.types";
import { runPromptRuntime } from "../chat/runtime/prompt-runtime";
import { OUTMODE } from "../chat/types/outmode";

export async function runDesignStage(params: {
  stage: DesignStage;
  decision: DecisionContext;
  instruction: string;
}): Promise<DesignHint | null> {
  const { stage, decision, instruction } = params;

  // 🔒 HARD GUARDS
  if (decision.reasoning.confidence < 0.55) return null;
  if (decision.reasoning.intent !== "design") return null;

  const result = await runPromptRuntime({
    personaRole: "research_designer",
    message: instruction,
    mode: "DEEP",
    stream: false,
    meta: {
      reasoning: decision.reasoning,
      outmode: OUTMODE.NORMAL,
      responseHint: {
        forbid: {
          narration: true,
          metaComment: true,
        },
      },
    },
  });

  if (!result.message || result.message.trim().length < 20) {
    return null;
  }

  return {
    stage,
    observations: result.message
      .split("\n")
      .map(l => l.trim())
      .filter(Boolean)
      .slice(0, 8),
    confidence: decision.reasoning.confidence,
  };
}
