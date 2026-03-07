import type { ChatMeta } from "../engines/chat-engine";
import type { DecisionContext } from "../decision/decision-context.types";
import { ChatEngine } from "../engines/chat-engine";
import { OUTMODE } from "../chat/types/outmode";
import { runDesignStage } from "../design/design-stage-runner";
import type { DesignHint } from "../design/design-hint.types";

export class DesignEngineV2 {
  static async run(
    decision: DecisionContext,
    persona: { role: string },
    meta: ChatMeta
  ) {
    const hints: DesignHint[] = [];

    const stages = [
      {
        stage: "INTENT",
        instruction:
          "Clarify the core design intent. Identify what problem must truly be solved, and what is explicitly out of scope.",
      },
      {
        stage: "CONSTRAINT",
        instruction:
          "Extract all explicit and implicit constraints. Consider technical, organizational, and operational limits.",
      },
      {
        stage: "OPTIONS",
        instruction:
          "Enumerate plausible solution approaches without judging them. Focus on diversity, not correctness.",
      },
      {
        stage: "RISKS",
        instruction:
          "Identify failure modes and hidden risks for the approaches. Include scaling, maintenance, and misuse risks.",
      },
      {
        stage: "TRADEOFFS",
        instruction:
          "Analyze key trade-offs among approaches. Highlight what is gained or lost when choosing each direction.",
      },
    ] as const;

    for (const s of stages) {
      const result = await runDesignStage({
        stage: s.stage,
        decision,
        instruction: s.instruction,
      });

      if (result) hints.push(result);
    }

    // 🔒 No design signal → fallback to normal chat
    if (hints.length === 0) {
      return ChatEngine.generateResponse(
        decision.sanitizedMessage,
        persona,
        meta
      );
    }

    // 🔥 Single final response
    return ChatEngine.generateResponse(
      decision.sanitizedMessage,
      persona,
      {
        ...meta,
        outmode: OUTMODE.DEEP,
        stream: meta.stream ?? true,
        // 🔥 NEW
        designHints: hints,
      }
    );
  }
}
