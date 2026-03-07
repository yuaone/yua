import { pgPool } from "../../../db/postgres";

export class JudgmentMetricsRepository {
  async recordHit(ruleId: string): Promise<void> {
    await pgPool.query(
      `
      INSERT INTO judgment_rule_metrics (rule_id, hits)
      VALUES ($1, 1)
      ON CONFLICT (rule_id)
      DO UPDATE SET
        hits = judgment_rule_metrics.hits + 1,
        last_hit_at = now(),
        last_updated_at = now()
      `,
      [ruleId]
    );
  }

  async recordFailure(
    ruleId: string,
    type: "soft" | "hard"
  ): Promise<void> {
    const column =
      type === "soft" ? "soft_failures" : "hard_failures";

    await pgPool.query(
      `
      INSERT INTO judgment_rule_metrics (rule_id, ${column})
      VALUES ($1, 1)
      ON CONFLICT (rule_id)
      DO UPDATE SET
        ${column} = judgment_rule_metrics.${column} + 1,
        last_updated_at = now()
      `,
      [ruleId]
    );
  }

  async get(ruleId: string): Promise<{
    hits: number;
    softFailures: number;
    hardFailures: number;
  } | null> {
    const { rows } = await pgPool.query(
      `
      SELECT
        hits,
        soft_failures AS "softFailures",
        hard_failures AS "hardFailures"
      FROM judgment_rule_metrics
      WHERE rule_id = $1
      `,
      [ruleId]
    );

    return rows[0] ?? null;
  }
}
