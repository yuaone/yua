// Memory Stream Emitter — SSE memory events via StreamEngine

import type { MemoryScope, MemoryStreamOp, MemoryStreamPayload } from "yua-shared/memory/types";
import type { YuaStreamEvent } from "../../types/stream";

export function buildMemoryStreamEvent(params: {
  traceId: string;
  op: MemoryStreamOp;
  scope: MemoryScope;
  content: string;
  memoryId?: number;
  confidence?: number;
  reason?: string;
  conflictWith?: number;
  mergedInto?: number;
}): YuaStreamEvent {
  const payload: MemoryStreamPayload = {
    op: params.op,
    scope: params.scope,
    content: params.content.slice(0, 200),
    memoryId: params.memoryId,
    confidence: params.confidence,
    reason: params.reason,
    conflictWith: params.conflictWith,
    mergedInto: params.mergedInto,
  };

  return {
    traceId: params.traceId,
    event: "memory",
    memory: payload,
  };
}
