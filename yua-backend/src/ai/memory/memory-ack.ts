// 🔥 YUA Memory ACK — PHASE 9-2 FINAL
// - LLM ❌
// - Stream ONLY
// - Deterministic / SSOT safe

import type { YuaStreamEvent } from "../../types/stream";

export function buildMemoryAckEvent(params: {
  traceId: string;
  message?: string;
}): YuaStreamEvent {
  return {
    traceId: params.traceId,
    event: "stage",
    stage: "system",
    topic: "memory.ack",
token:
  params.message ??
  "알겠어. 이 내용은 앞으로 참고할 수 있도록 기억해둘게. 언제든 새로운 대화에서도 이어가자고 해줘",
  };
}
