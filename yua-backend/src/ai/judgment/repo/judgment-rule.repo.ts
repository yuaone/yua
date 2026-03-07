import { pgPool } from "../../../db/postgres";
import type { JudgmentRule } from "../judgment-rule";

export class JudgmentRuleRepository {
  async upsert(rule: JudgmentRule): Promise<void> {
    await pgPool.query(
      `
      INSERT INTO judgment_rules (
        id,
        type,
        trigger_hint,
        source,
        confidence,
        decay,
        status,
        created_at,
        last_applied_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,
              to_timestamp($8 / 1000.0),
              $9)
      ON CONFLICT (id) DO UPDATE SET
        confidence = EXCLUDED.confidence,
        decay = EXCLUDED.decay,
        status = EXCLUDED.status,
        last_applied_at = EXCLUDED.last_applied_at
      `,
      [
        rule.id,
        rule.type,
        rule.triggerHint,
        rule.source,
        rule.confidence,
        rule.decay,
        rule.status ?? "active",
        rule.createdAt,
        rule.lastAppliedAt
          ? new Date(rule.lastAppliedAt)
          : null,
      ]
    );
  }

  async getActive(): Promise<JudgmentRule[]> {
    const { rows } = await pgPool.query(
      `
      SELECT
        id,
        type,
        trigger_hint AS "triggerHint",
        source,
        confidence,
        decay,
        status,
        extract(epoch from created_at) * 1000 AS "createdAt",
        extract(epoch from last_applied_at) * 1000 AS "lastAppliedAt"
      FROM judgment_rules
      WHERE status != 'disabled'
      `
    );

    return rows;
  }

  async disable(ruleId: string): Promise<void> {
    await pgPool.query(
      `
      UPDATE judgment_rules
      SET status = 'disabled'
      WHERE id = $1
      `,
      [ruleId]
    );
  }
}
