import type { ThoughtStage } from "@/components/common/thoughtStage";

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
  const { isFirst, finalized, thoughtStage, hasSuggestion } = args;

  if (isFirst) return "intro";

  if (finalized && hasSuggestion) {
    return "wrap";
  }

  if (thoughtStage === "structure" || thoughtStage === "map" || thoughtStage === "compare") {
    return "turn";
  }

  return "flow";
}
