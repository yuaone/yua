// 📂 src/jobs/judgment-rule-auto-disable.ts
// 🔥 PHASE 4-D — Judgment Rule Auto Disable Batch (FINAL)

import { pgPool } from "../db/postgres";
import { log } from "../utils/logger";

/**
 * 설정값 (SSOT)
 */
const WINDOW_MINUTES = 15;
const HARD_RATIO_THRESHOLD = 0.03;

export async function runJudgmentRuleAutoDisableBatch() {
  const client = await pgPool.connect();

  try {
    log("🧠 [JudgmentBatch] Start rule auto-disable check");

    /**
     * 1️⃣ 최근 failure 집계
     */
    const recent = await client.query<{
      instance_id: string;
      total: number;
      hard_count: number;
      hard_ratio: number;
    }>(`
      WITH recent AS (
        SELECT
          instance_id,
          COUNT(*) AS total,
          COUNT(*) FILTER (WHERE type = 'hard') AS hard_count
        FROM judgment_failures
        WHERE created_at >= NOW() - INTERVAL '${WINDOW_MINUTES} minutes'
        GROUP BY instance_id
      )
      SELECT
        instance_id,
        total,
        hard_count,
        (hard_count::float / NULLIF(total, 0)) AS hard_ratio
      FROM recent
      WHERE (hard_count::float / NULLIF(total, 0)) >= $1
    `, [HARD_RATIO_THRESHOLD]);

    if (recent.rowCount === 0) {
      log("🟢 [JudgmentBatch] No instance exceeded hard failure threshold");
      return;
    }

    /**
     * 2️⃣ Instance 단위 Rule Disable
     */
    for (const row of recent.rows) {
      const { instance_id, hard_ratio, total } = row;

      log(
        `🚨 [JudgmentBatch] Disable rules | instance=${instance_id} ratio=${hard_ratio.toFixed(
          3
        )} total=${total}`
      );

      const result = await client.query(`
        UPDATE judgment_rules
        SET
          status = 'disabled',
          disabled_reason = 'hard_failure_ratio_exceeded',
          disabled_at = NOW()
        WHERE instance_id = $1
          AND status = 'active'
      `, [instance_id]);

      log(
        `⛔ [JudgmentBatch] Disabled ${result.rowCount} rules for instance=${instance_id}`
      );
    }

    log("✅ [JudgmentBatch] Completed");
  } catch (err: any) {
    log("❌ [JudgmentBatch] Error: " + err.message);
  } finally {
    client.release();
  }
}

/**
 * CLI 실행 지원
 * node dist/jobs/judgment-rule-auto-disable.js
 */
if (require.main === module) {
  runJudgmentRuleAutoDisableBatch()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
