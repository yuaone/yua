import { JudgmentRegistry } from "./judgment-registry";
import { JudgmentRule } from "./judgment-rule";
import {
  reinforceRule,
  penalizeRule,
} from "./judgment-lifecycle";
import { judgmentMetrics } from "./judgment-metrics";
import { updateJudgmentRule } from "./persist/judgment-rule-writer";
import { RuleMutationLogger } from "./judgment-rule-mutation-logger";

export interface RuleGovernorConfig {
  promoteHitThreshold: number;
  demoteFailureThreshold: number;
  hardFailureKillThreshold: number;
}

export class JudgmentRuleGovernor {
  constructor(
    private readonly registry: JudgmentRegistry,
    private readonly config: RuleGovernorConfig = {
      promoteHitThreshold: 5,
      demoteFailureThreshold: 3,
      hardFailureKillThreshold: 2,
    }
  ) {}

  /**
   * 🔁 Rule Lifecycle Automation (PHASE 8-3)
   *
   * - Drift 결과 기반 자동 상태 전이
   * - 판단 ❌ / 상태 조정 ⭕
   */
  async run(): Promise<void> {
    for (const rule of this.registry.getAll()) {
      if (rule.status === "disabled") continue;

      const metric = judgmentMetrics.get(rule.id);
      if (!metric) continue;

      let updated: JudgmentRule | null = null;
      let mutation:
        | {
            type:
              | "PROMOTE"
              | "DEMOTE_SOFT"
              | "DEMOTE_HARD"
              | "DISABLE";
            reason: string;
            prevConfidence: number;
          }
        | null = null;

      // 🔼 승진
      if (
        metric.hits >= this.config.promoteHitThreshold &&
        metric.hardFailures === 0
      ) {
        updated = reinforceRule(rule, 0.08);
        mutation = {
          type: "PROMOTE",
          reason: "hit_threshold_reached",
          prevConfidence: rule.confidence,
        };
      }

      // 🔽 Soft 약화
      if (
        metric.softFailures >=
        this.config.demoteFailureThreshold
      ) {
        updated = penalizeRule(rule, "soft");
        mutation = {
          type: "DEMOTE_SOFT",
          reason: "soft_failure_threshold",
          prevConfidence: rule.confidence,
        };
      }

      // ☠️ Hard 퇴출
      if (
        metric.hardFailures >=
        this.config.hardFailureKillThreshold
      ) {
        updated = penalizeRule(rule, "hard");
        mutation = {
          type: "DISABLE",
          reason: "hard_failure_threshold",
          prevConfidence: rule.confidence,
        };
      }

      if (updated && mutation) {
        this.registry.update(updated);
        await updateJudgmentRule(updated);
        await RuleMutationLogger.log(updated, mutation);
      }
    }
  }
}
