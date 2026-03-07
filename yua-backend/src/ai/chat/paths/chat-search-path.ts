import type { ChatRuntimeContext, ChatResponse } from "../types/chat-io";
import { runLegacyChat } from "../legacy/legacy-chat-engine-adapter";

export async function runSearchPath(ctx: ChatRuntimeContext): Promise<ChatResponse> {
  return runLegacyChat(ctx);
}
