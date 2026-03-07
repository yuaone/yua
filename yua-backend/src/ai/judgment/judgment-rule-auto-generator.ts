// 🔥 PHASE 4-A
// Failure → JudgmentRule 자동 생성기 (SSOT SAFE)

import { JudgmentFailureStore } from "./judgment-failure-store";
import { JudgmentRegistry } from "./judgment-registry";
import { persistJudgmentRule } from "./persist/judgment-rule-writer";
import {
  createRuleFromFailure,
} from "./judgment-lifecycle";
import type { JudgmentFailureLog } from "./judgment-failure-log";

export interface AutoRuleConfig {
  minOccurrences: number;
  windowSize: number;
  minAverageConfidence: number;
}

export class JudgmentRuleAutoGenerator {
  constructor(
    private readonly failureStore: JudgmentFailureStore,
    private readonly registry: JudgmentRegistry,
    private readonly config: AutoRuleConfig = {
      minOccurrences: 3,
      windowSize: 20,
      minAverageConfidence: 0.55,
    }
  ) {}

  async run(): Promise<void> {
    const recent = this.failureStore.getRecent(
      this.config.windowSize
    );

    const grouped = this.groupByReason(recent);

    for (const [reason, logs] of grouped) {
      if (logs.length < this.config.minOccurrences) continue;

      const avg =
        logs.reduce((s, l) => s + l.confidence, 0) /
        logs.length;

      if (avg < this.config.minAverageConfidence)
        continue;

      // 🔒 중복 Rule 방지
      const exists = this.registry
        .getAll()
        .some(r => r.triggerHint === reason);

      if (exists) continue;

      const rule = createRuleFromFailure({
        triggerHint: reason,
        source: "learning",
        type: logs.some(l => l.type === "hard")
          ? "block"
          : "soft",
      });

      this.registry.add(rule);
      await persistJudgmentRule(rule); // ✅ DB INSERT
    }
  }

  private groupByReason(
    logs: JudgmentFailureLog[]
  ): Map<string, JudgmentFailureLog[]> {
    const map = new Map<string, JudgmentFailureLog[]>();
    for (const log of logs) {
      const bucket = map.get(log.reason) ?? [];
      bucket.push(log);
      map.set(log.reason, bucket);
    }
    return map;
  }
}
