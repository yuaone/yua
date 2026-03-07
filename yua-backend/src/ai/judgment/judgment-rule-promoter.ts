// src/ai/judgment/judgment-rule-promoter.ts
// 🔒 STEP A: Rule Promotion

import { JudgmentRegistry } from "./judgment-registry";
import { JudgmentRule } from "./judgment-rule";

export function promoteRules(
  registry: JudgmentRegistry,
  candidates: JudgmentRule[]
): void {
  for (const rule of candidates) {
    const exists = registry
      .getAll()
      .some(r => r.triggerHint === rule.triggerHint);

    if (!exists) {
      registry.add({
        ...rule,
        confidence: Math.min(rule.confidence ?? 0.5, 0.9),
        decay: rule.decay ?? 0.01,
        source: rule.source ?? "learning",
      });
    }
  }
}
