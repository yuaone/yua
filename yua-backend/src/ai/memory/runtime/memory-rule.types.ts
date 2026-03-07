// 📂 src/ai/memory/runtime/memory-rule.types.ts
// 🔒 YUA Memory Rule Types — PHASE 11 SSOT

export interface MemoryRuleSnapshot {
  auto_commit: {
    min_confidence: number;
    min_length: number;
  };

  drift: {
    low: number;
    medium: number;
    high: number;
  };

  merge: {
    similarity_threshold: number;
  };

  decay: {
    base_rate: number;
    usage_bonus: number;
  };

  meta: {
    sample_count: number;
    active_count: number;
  };
}
