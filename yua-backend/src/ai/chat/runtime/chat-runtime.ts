// 📂 src/ai/runtime/chat-runtime.ts
// 🔒 ChatRuntime — SSOT FINAL (PHASE 7-4)
// ------------------------------------
// 책임:
// - Chat ExecutionPlan → ExecutionEngine 위임
// - stream / non-stream 분기만 수행
//
// 금지:
// - Prompt 생성 ❌
// - 판단 ❌
// - 스트림 lifecycle 제어 ❌ (Controller/StreamEngine 책임)

import { ExecutionEngine } from "../../execution/execution-engine";
import type { ExecutionRuntimeResult } from "../../execution/execution-router";
import type { ChatMode } from "../types/chat-mode";
import { OUTMODE } from "../types/outmode";

export interface ChatRuntimeInput {
  message: string;
  prompt: string;
  threadId: number;
  traceId: string;
  workspaceId: string;
  userId: number;
  userName?: string | null;
  mode: ChatMode;
  thinkingProfile: "FAST" | "NORMAL" | "DEEP";
  outmode?: OUTMODE;
  stream: boolean;
  path?: string;
  forceSearch?: boolean;
  onSearchProgress?: (ev: any) => void;
}

export const ChatRuntime = {
  async run(input: ChatRuntimeInput): Promise<ExecutionRuntimeResult> {
    const {
      prompt,
      threadId,
      traceId,
      workspaceId,
      userId,
      mode,
      outmode,
      stream,
      path,
      forceSearch,
    } = input;

    // 🔥 ExecutionEngine은 스트림/비스트림 모두 처리
   await ExecutionEngine.execute({
      threadId,
      traceId,
      workspaceId,
      userId,
      userName: input.userName,
      prompt,
      mode,
      thinkingProfile: input.thinkingProfile,
      sessionId: null,
      outmode,
      stream,
      path,
      forceSearch,
    });

    return {
     ok: true,
      output: {
        requiresLLM: false,
        streamed: stream === true,
      },
    };
  },
};
