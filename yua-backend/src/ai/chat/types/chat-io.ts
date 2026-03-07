import type { ReasoningResult } from "../../reasoning/reasoning-engine";
import { OUTMODE } from "./outmode";

export type ChatRequest = {
  threadId: number;
  content: string;
  outMode: OUTMODE;
  meta?: {
    userId?: number;
    planId?: number | string;
    allowSearch?: boolean;
    allowMemory?: boolean;
    stream?: boolean;
    traceId?: string;
    ip?: string;
    apiKey?: string;
    instanceId?: string;
    userType?: string;
  };
};

export type ChatResponse = {
  ok: boolean;
  traceId: string;
  outMode: OUTMODE;
  latency: number;
  answer: string;
  artifacts?: unknown;
  debug?: unknown;
};

export type ChatRuntimeContext = {
  req: ChatRequest;
  traceId: string;
  startedAt: number;
  reasoning: ReasoningResult;
};
