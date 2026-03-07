import type { MemoryIntent } from "./memory-intent";
import type { MemoryAction } from "./memory-action";

export function mapIntentToMemoryAction(
  intent: MemoryIntent
): MemoryAction {
  switch (intent) {
    case "CONTEXT":
      return "SHORT";

    case "DECISION":
      return "LONG";

    case "ARCHITECTURE":
      return "PROJECT";

    case "REMEMBER":
      return "PROFILE";

    case "NONE":
    default:
      return "NONE";
  }
}
