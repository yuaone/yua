import { pgPool } from "../../../db/postgres";
import { log } from "../../../utils/logger";

export async function runHardFailureBatch() {
  const { rows } = await pgPool.query<{
    instance_id: string;
    hard_ratio: number;
  }>(`
    WITH recent AS (
      SELECT
        instance_id,
        COUNT(*) AS total,
        COUNT(*) FILTER (WHERE type = 'hard') AS hard_count
      FROM judgment_failures
      WHERE created_at >= NOW() - INTERVAL '15 minutes'
      GROUP BY instance_id
    )
    SELECT
      instance_id,
      (hard_count::float / NULLIF(total, 0)) AS hard_ratio
    FROM recent
    WHERE (hard_count::float / NULLIF(total, 0)) >= 0.03
  `);

  for (const row of rows) {
    await pgPool.query(
      `
      UPDATE judgment_rules
      SET
        status = 'disabled',
        disabled_reason = 'hard_failure_ratio_exceeded',
        disabled_at = NOW()
      WHERE instance_id = $1
        AND status = 'active'
      `,
      [row.instance_id]
    );

    log(
      `🚫 [Judgment] Disabled rules for instance=${row.instance_id}, ratio=${row.hard_ratio}`
    );
  }
}
