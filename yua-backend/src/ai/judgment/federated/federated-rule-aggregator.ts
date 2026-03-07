// 🔥 PHASE 5-B
// Federated Rule Aggregator — SSOT FINAL

import { pgPool } from "../../../db/postgres";

export interface FederatedPolicy {
  minInstances: number;
  minFailuresPerInstance: number;
  minTotalFailures: number;
  maxInstanceDominanceRatio: number;
}

export const DEFAULT_FEDERATED_POLICY: FederatedPolicy = {
  minInstances: 3,
  minFailuresPerInstance: 2,
  minTotalFailures: 6,
  maxInstanceDominanceRatio: 0.4,
};

export class FederatedRuleAggregator {
  constructor(
    private readonly policy: FederatedPolicy =
      DEFAULT_FEDERATED_POLICY
  ) {}

  /**
   * 🔁 15분 배치 집계
   */
  async aggregate(windowMinutes = 15): Promise<void> {
    const { rows } = await pgPool.query<{
      reason: string;
      instance_id: string;
      cnt: number;
    }>(
      `
      SELECT
        reason,
        instance_id,
        COUNT(*) as cnt
      FROM judgment_failures
      WHERE created_at >= NOW() - INTERVAL '${windowMinutes} minutes'
      GROUP BY reason, instance_id
      `
    );

    const grouped = new Map<
      string,
      Map<string, number>
    >();

    for (const r of rows) {
      if (!grouped.has(r.reason)) {
        grouped.set(r.reason, new Map());
      }
      grouped.get(r.reason)!.set(
        r.instance_id,
        Number(r.cnt)
      );
    }

    for (const [reason, perInstance] of grouped) {
      const instanceCount = perInstance.size;
      const totalFailures = [...perInstance.values()].reduce(
        (a, b) => a + b,
        0
      );

      if (instanceCount < this.policy.minInstances)
        continue;
      if (totalFailures < this.policy.minTotalFailures)
        continue;

      const maxShare =
        Math.max(...perInstance.values()) /
        totalFailures;

      if (
        maxShare >
        this.policy.maxInstanceDominanceRatio
      ) {
        continue;
      }

      // ✅ delta 생성
      await pgPool.query(
        `
        INSERT INTO judgment_rule_deltas
          (trigger_hint, delta, source, created_at)
        VALUES ($1, $2, 'federated', NOW())
        `,
        [reason, this.calculateDelta(totalFailures)]
      );
    }
  }

  private calculateDelta(totalFailures: number): number {
    return Math.min(0.15, 0.02 * totalFailures);
  }
}
