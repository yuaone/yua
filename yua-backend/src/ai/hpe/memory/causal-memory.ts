// 📂 src/ai/hpe/memory/causal-memory.ts

import { MemoryStorage } from "./memory-storage";
import { CausalLink, MemoryRecord } from "./memory-types";

export const CausalMemory = {
  build(): CausalLink[] {
    const all = MemoryStorage.all();

    if (all.length < 2) return [];

    const sorted = [...all].sort((a, b) => a.timestamp - b.timestamp);

    const links: CausalLink[] = [];

    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      const next = sorted[i + 1];

      const weight =
        ((current.strength + next.strength) / 2) *
        this.timeDecay(current.timestamp, next.timestamp);

      links.push({
        from: current.id,
        to: next.id,
        weight: Math.max(0.01, weight),
      });
    }

    return links;
  },

  timeDecay(t1: number, t2: number) {
    const dtHours = Math.abs(t2 - t1) / (1000 * 60 * 60);
    const lambda = 0.03;
    return Math.exp(-lambda * dtHours);
  },

  traceFrom(id: string) {
    const all = MemoryStorage.all();
    const links = this.build();

    const chain: MemoryRecord[] = [];
    let currentId = id;

    for (let i = 0; i < 10; i++) {
      const nextLink = links.find((l) => l.from === currentId);
      if (!nextLink) break;

      const nextRecord = all.find((r) => r.id === nextLink.to);
      if (!nextRecord) break;

      chain.push(nextRecord);
      currentId = nextRecord.id;
    }

    return chain;
  }
};
