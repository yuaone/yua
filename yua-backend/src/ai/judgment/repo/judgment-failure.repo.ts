import { pgPool } from "../../../db/postgres";
import type { JudgmentFailureLog } from "../judgment-failure-log";

export class JudgmentFailureRepository {
  async insert(log: JudgmentFailureLog): Promise<void> {
    await pgPool.query(
      `
      INSERT INTO judgment_failures (
        id,
        input,
        path,
        corrected_path,
        confidence,
        reason,
        type,
        stage,
        created_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,to_timestamp($9 / 1000.0))
      `,
      [
        log.id,
        log.input,
        log.path,
        log.correctedPath ?? null,
        log.confidence,
        log.reason,
        log.type,
        log.stage,
        log.timestamp,
      ]
    );
  }

  async getRecent(limit = 50): Promise<JudgmentFailureLog[]> {
    const { rows } = await pgPool.query(
      `
      SELECT
        id,
        input,
        path,
        corrected_path AS "correctedPath",
        confidence,
        reason,
        type,
        stage,
        extract(epoch from created_at) * 1000 AS timestamp
      FROM judgment_failures
      ORDER BY created_at DESC
      LIMIT $1
      `,
      [limit]
    );

    return rows;
  }

  async countByReason(
    reason: string,
    windowMinutes = 60
  ): Promise<number> {
    const { rows } = await pgPool.query(
      `
      SELECT COUNT(*)::int AS count
      FROM judgment_failures
      WHERE reason = $1
        AND created_at >= now() - interval '${windowMinutes} minutes'
      `,
      [reason]
    );

    return rows[0]?.count ?? 0;
  }
}
