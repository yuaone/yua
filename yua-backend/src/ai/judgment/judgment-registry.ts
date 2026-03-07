// 📂 src/ai/judgment/judgment-registry.ts
// 🔒 Judgment Registry — PHASE 3 FINAL (SSOT-6.5)

import { JudgmentRule } from "./judgment-rule";
import { isRuleActive } from "./judgment-lifecycle";
import type { JudgmentInput } from "./judgment-input";
import type { DecisionResult } from "../../types/decision";

export class JudgmentRegistry {
  private rules = new Map<string, JudgmentRule>();

  /* -------------------------------
     Rule Management
  ------------------------------- */

  add(rule: JudgmentRule): void {
    this.rules.set(rule.id, rule);
  }

  update(rule: JudgmentRule): void {
    this.rules.set(rule.id, rule);
  }

  getAll(): JudgmentRule[] {
    return [...this.rules.values()];
  }

  getActive(): JudgmentRule[] {
    return this.getAll().filter(isRuleActive);
  }

  /* -------------------------------
     Decision Entry (SSOT-6.5)
  ------------------------------- */

  async evaluate(
    input: JudgmentInput
  ): Promise<DecisionResult> {
    const rules = this.getActive();

    const score: Record<
      "strict" | "soft" | "block" | "defer",
      number
    > = {
      strict: 0,
      soft: 0,
      block: 0,
      defer: 0,
    };

    for (const rule of rules) {
      const matched = await rule.match(input);
      if (!matched) continue;

      score[rule.type] += rule.confidence;

      rule.lastAppliedAt = Date.now();
      rule.stats = {
        hits: (rule.stats?.hits ?? 0) + 1,
        softFailures: rule.stats?.softFailures ?? 0,
        hardFailures: rule.stats?.hardFailures ?? 0,
        lastFailureAt: rule.stats?.lastFailureAt,
      };
    }

    /* ---------------------------------
       Verdict Synthesis (SSOT)
    --------------------------------- */

    let verdict: DecisionResult["verdict"] = "APPROVE";

    if (score.block > 0.6) verdict = "REJECT";
    else if (score.defer > 0.5) verdict = "HOLD";
    else if (score.strict > 0.7) verdict = "HOLD";

    const confidence =
      verdict === "APPROVE"
        ? Math.max(0, 1 - score.block - score.defer)
        : Math.max(
            score.block,
            score.defer,
            score.strict
          );

    return {
      verdict,
      source: "RULE",
      confidence: Math.min(1, confidence),
      reversible: true,
    };
  }

  /* -------------------------------
     TTL-based Decay
  ------------------------------- */

  cleanup(ttlMs = 1000 * 60 * 60 * 24): void {
    const now = Date.now();
    for (const rule of this.rules.values()) {
      if (
        rule.lastAppliedAt &&
        now - rule.lastAppliedAt > ttlMs
      ) {
        rule.confidence = Math.max(
          0,
          rule.confidence - rule.decay * 2
        );
        rule.status =
          rule.confidence <= 0
            ? "disabled"
            : rule.status;
      }
    }
  }
}
