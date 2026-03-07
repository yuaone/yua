import type { TurnFlow } from "../chat/types/turn-flow";
import type { TurnIntent } from "../chat/types/turn-intent";
import type { ReasoningResult } from "../reasoning/reasoning-engine";
import type { PathType } from "../../routes/path-router";

export type Mode = "FAST" | "NORMAL" | "DEEP";

export function decideMode(params: {
  path: PathType;
  turnFlow?: TurnFlow;
  turnIntent?: TurnIntent;
  reasoning: ReasoningResult;
}): Mode {
  const { path, turnFlow, turnIntent, reasoning } = params;

  // 🔒 HARD RULE 1: CONTINUATION NEVER FAST
  if (
    turnFlow === "ACK_CONTINUE" ||
    turnIntent === "CONTINUATION"
  ) {
    return "NORMAL";
  }

  // 🔒 HARD RULE 2: IMAGE ALWAYS NORMAL+
  if ((reasoning as any).__internal?.inputSignals?.hasImage) {
    return "NORMAL";
  }

  if (
    reasoning.intent === "design" ||
    reasoning.intent === "debug"
  ) {
    // 🔥 DEEP은 사용자 선택 + 설계/디버깅 intent면 허용
    return "DEEP";
  }

  // 🔒 HARD RULE 4: FAST only for true direct chat
  if (
    path === "FAST" &&
    reasoning.depthHint === "shallow" &&
    reasoning.confidence < 0.75
  ) {
    return "FAST";
  }

  return "NORMAL";
}
