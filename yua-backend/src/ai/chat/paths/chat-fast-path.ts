import type { ChatRuntimeContext, ChatResponse } from "../types/chat-io";
import { runLegacyChat } from "../legacy/legacy-chat-engine-adapter";

export async function runFastPath(ctx: ChatRuntimeContext): Promise<ChatResponse> {
  return runLegacyChat(ctx, {
    thinkingProfile: "FAST",
    reasoning: undefined,
    maxSegments: 1,
    computePolicy: { tier: "FAST", maxSegments: 1, flushIntervalMs: 25, idleMs: 1200 },
  });
}
