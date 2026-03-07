// src/ai/judgment/judgment-revalidator.ts

import { JudgmentRule } from "./judgment-rule";

export function revalidateRule(rule: JudgmentRule): JudgmentRule {
  const age = Date.now() - rule.createdAt;
  const days = age / (1000 * 60 * 60 * 24);

  if (days > 7) {
    return {
      ...rule,
      confidence: rule.confidence * 0.9,
    };
  }

  return rule;
}
