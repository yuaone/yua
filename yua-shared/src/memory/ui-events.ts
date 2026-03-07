// 🔒 YUA Memory UI Events — STREAM → UI Bridge

import type { MemoryAckPayload } from "./types";

export type MemoryUIEvent =
  | {
      type: "memory_ack";
      payload: MemoryAckPayload;
    };
