// ===================================================================
// Fusion Layer — SSOT v10.0 Final
// Merges multi-engine output → unified FusionFrame
// ===================================================================

import type { EngineResult } from "../../types/engine-result";

export interface FusionFrame {
  ok: boolean;
  output?: string;
  engineOutputs: Record<string, EngineResult[]>;
  meta?: Record<string, any>;
}

export class FusionLayer {
  static fuse(results: EngineResult[]): FusionFrame {
    const grouped: Record<string, EngineResult[]> = {};

    for (const r of results) {
      const key = r.engine ?? "unknown";
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(r);
    }

    const primary = FusionLayer.pickPrimary(grouped);

    return {
      ok: primary?.ok ?? false,
      output: primary?.output ?? "",
      engineOutputs: grouped,
      meta: { fusion: "v10.0" },
    };
  }

  // 우선순위: LLM > logic > quantum > system > math > parallel > tensor > memory
  private static pickPrimary(map: Record<string, EngineResult[]>): EngineResult | null {
    const priority = [
      "llm",
      "logic",
      "quantum",
      "system",
      "math",
      "parallel",
      "tensor",
      "memory",
    ];

    for (const p of priority) {
      if (map[p]?.length) return map[p][map[p].length - 1];
    }
    return null;
  }
}
