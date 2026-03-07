// 📂 src/ai/hpe/hpe7/mem-reasoner.ts
// ------------------------------------------------------
// Memory Reasoner — Summaries + Pattern Detection
// ------------------------------------------------------

import { MemoryLoader } from "./mem-loader";
import { CausalEvent } from "./hpe7-protocol";

export class MemoryReasoner {
  
  // Summarize last N hours
  static summarizeRecent(hours = 24) {
    const cutoff = Date.now() - hours * 3600_000;

    const logs = MemoryLoader.getAll().filter(l => l.ts >= cutoff);

    return {
      total: logs.length,
      samples: logs.slice(-10)
    };
  }

  // Detect frequent keywords (very lightweight)
  static detectPatterns() {
    const recent = MemoryLoader.getRecent(200);
    const freq: Record<string, number> = {};

    for (const r of recent) {
      const words = (r.input + " " + r.output)
        .toLowerCase()
        .replace(/[^a-z0-9가-힣\s]/g, "")
        .split(/\s+/);

      for (const w of words) {
        if (!w || w.length < 2) continue;
        freq[w] = (freq[w] || 0) + 1;
      }
    }

    const sorted = Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15);

    return sorted.map(([word, count]) => ({ word, count }));
  }
}
