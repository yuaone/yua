import { OUTMODE } from "./types/outmode";
import type { ChatRuntimeContext, ChatResponse } from "./types/chat-io";

import { runFastPath } from "./paths/chat-fast-path";
import { runNormalPath } from "./paths/chat-normal-path";
import { runDeepPath } from "./paths/chat-deep-path";
import { runSearchPath } from "./paths/chat-search-path";
import { runResearchPath } from "./paths/chat-research-path";
import { runEngineGuidePath } from "./paths/chat-engine-guide-path";

export async function runChatByOutMode(ctx: ChatRuntimeContext): Promise<ChatResponse> {
  switch (ctx.req.outMode) {
    case OUTMODE.FAST:
      return runFastPath(ctx);
    case OUTMODE.NORMAL:
      return runNormalPath(ctx);
    case OUTMODE.DEEP:
      return runDeepPath(ctx);
    case OUTMODE.SEARCH:
      return runSearchPath(ctx);
    case OUTMODE.RESEARCH:
      return runResearchPath(ctx);
    case OUTMODE.ENGINE_GUIDE:
      return runEngineGuidePath(ctx);
    default:
      throw new Error(`[SSOT] Unsupported outMode: ${String(ctx.req.outMode)}`);
  }
}
