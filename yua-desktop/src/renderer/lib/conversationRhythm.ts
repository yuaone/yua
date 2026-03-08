// src/renderer/lib/conversationRhythm.ts
// Ported from yua-web/src/lib/conversationRhythm.ts

import type { ThoughtStage } from "@/lib/thoughtStage";

export type ConversationRhythm =
  | "intro"
  | "flow"
  | "turn"
  | "wrap";

export function decideRhythm(args: {
  index: number;
  isFirst: boolean;
  finalized: boolean;
  thoughtStage?: ThoughtStage;
  hasSuggestion?: boolean;
}): ConversationRhythm {
  const {
    isFirst,
    finalized,
    thoughtStage,
    hasSuggestion,
  } = args;

  if (isFirst) return "intro";

  if (finalized && hasSuggestion) {
    return "wrap";
  }

  if (
    thoughtStage === "structure" ||
    thoughtStage === "map" ||
    thoughtStage === "compare"
  ) {
    return "turn";
  }

  return "flow";
}
