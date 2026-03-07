// 📂 src/ai/memory/index.ts
// 🔥 Memory Integration Hub — FINAL (2025.11)

import { MemoryManager } from "./memory-manager";
import { LongMemoryEngine } from "./memory-long";
import { ShortMemoryEngine } from "./memory-short";
import { FastCache } from "./fast-cache";
import { MemoryVectorSync } from "./memory-vector-sync";

export const Memory = {
  short: ShortMemoryEngine,
  long: LongMemoryEngine,
  manager: MemoryManager,
  cache: FastCache,
  vectorSync: MemoryVectorSync,
};
