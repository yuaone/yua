import type { ThinkingProfile, DeepVariant } from "../types/thinkingProfile";
import type { ActivityEventPayload } from "./activity";
import type { StreamStage } from "./stream-stage";
import type { MemoryStreamPayload } from "../memory/types";

export type StreamEventKind =
| "ready"      // ✅ 추가
  | "stage"
  | "token"
  | "final"
  | "suggestion"
  | "done"
  | "reasoning_block"
  | "reasoning_done"
  | "answer_unlocked"
  | "activity"
  | "memory";

export type StreamPayload = {
  traceId?: string;
  event?: StreamEventKind;
  stage?: StreamStage;
  topic?: string;
  token?: string;

  // logical end
  final?: boolean;
  finalText?: string;

  // transport end
  done?: boolean;

  // suggestion payload (shape is app-level; keep permissive here)
  suggestion?: unknown;

  // 🔥 SSOT: unified activity
  activity?: ActivityEventPayload;
  // 🔥 reasoning block (DEEP only)
  block?: {
    id: string;
    title?: string;
    body?: string;
    inlineSummary?: string;
    groupIndex?: number;
  };


 reasoning_done?: {
   id: string;
 };
  meta?: {
    thinkingProfile?: ThinkingProfile;
    deepVariant?: DeepVariant;
    modelId?: string;
    openaiSeq?: number; // upstream ordering hint (optional)
    isImageOnly?: boolean;
    disableTyping?: boolean;
    [key: string]: unknown;
  };

  // memory SSE
  memory?: MemoryStreamPayload;

  // resume
  eventId?: number;
  role?: "assistant" | "system" | "tool";
  internal?: boolean;
};

export type StreamClientHandlers = {
  onReady: (payload?: StreamPayload) => void;
  onToken: (token: string, payload?: StreamPayload) => void;
  onStage?: (stage: StreamStage, payload: StreamPayload) => void;
  onFinal?: (payload?: StreamPayload) => void;
  onDone: (payload?: StreamPayload) => void;
  onSuggestion?: (payload: StreamPayload) => void;
  onActivity?: (activity: ActivityEventPayload, payload?: StreamPayload) => void;
  onReasoningBlock?: (
    block: NonNullable<StreamPayload["block"]>,
    payload?: StreamPayload
  ) => void;
  onReasoningDone?: () => void;
  onMemory?: (memory: MemoryStreamPayload, payload?: StreamPayload) => void;
  onError?: (error: unknown) => void;
};

export type StreamClientOptions = {
  authFetch: (input: RequestInfo, init?: RequestInit) => Promise<Response>;
  threadId: number;
  message?: string;
  handlers: StreamClientHandlers;

  // 🔥 debug mode
  debug?: boolean;
};
