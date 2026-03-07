// 🔒 Memory Loader (Read-Only Snapshot)

import { MemoryNode, QGMLMemoryState } from "../types";

export function loadMemoryState(
  memories?: MemoryNode[]
): QGMLMemoryState {
  const state: QGMLMemoryState = {};

  if (!memories) return state;

  for (const mem of memories) {
    state[mem.name] = [];
  }

  return state;
}
