import { pgPool } from "../../db/postgres";
import type { MemoryScope } from "./memory-scope-router";

export interface MemoryPolicy {
  minConfidence: number;
  llmEnabled: boolean;
  decayRate: number;
  inactiveDays: number;
  reinforcementBoost: number;
}

const DEFAULT_POLICY: MemoryPolicy = {
  minConfidence: 0.65,
  llmEnabled: true,
  decayRate: 0.01,
  inactiveDays: 30,
  reinforcementBoost: 0.1,
};

export const MemoryPolicyResolver = {
  async resolve(scope: MemoryScope): Promise<MemoryPolicy> {
    const sql = `
      SELECT
        min_confidence,
        llm_enabled,
        decay_rate,
        inactive_days,
        reinforcement_boost
      FROM memory_decay_policy
      WHERE scope = $1
      LIMIT 1
    `;

    try {
      const { rows } = await pgPool.query(sql, [scope]);
      if (!rows.length) return DEFAULT_POLICY;

      const r = rows[0];
      return {
        minConfidence: r.min_confidence ?? DEFAULT_POLICY.minConfidence,
        llmEnabled: r.llm_enabled ?? DEFAULT_POLICY.llmEnabled,
        decayRate: r.decay_rate ?? DEFAULT_POLICY.decayRate,
        inactiveDays: r.inactive_days ?? DEFAULT_POLICY.inactiveDays,
        reinforcementBoost:
          r.reinforcement_boost ?? DEFAULT_POLICY.reinforcementBoost,
      };
    } catch {
      return DEFAULT_POLICY;
    }
  },
};
