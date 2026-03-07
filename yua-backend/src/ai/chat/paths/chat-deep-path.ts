import type { ChatRuntimeContext, ChatResponse } from "../types/chat-io";
import { runLegacyChat } from "../legacy/legacy-chat-engine-adapter";

export async function runDeepPath(ctx: ChatRuntimeContext): Promise<ChatResponse> {
  return runLegacyChat(ctx, {
    thinkingProfile: "DEEP",
    reasoning: { summary: "detailed", effort: "medium" },
    maxSegments: 5,
    computePolicy: { tier: "DEEP", maxSegments: 5, flushIntervalMs: 180, idleMs: 3500 },
  });
}
