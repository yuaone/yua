// 🔒 PHASE 9 Runtime Window Aggregator (SSOT)

import { pgPool } from "../../db/postgres";

/**
 * - raw_event_log → 시간 윈도우 집계
 * - READ / ANALYSIS ONLY
 * - Runtime 판단 ❌
 */
export class RuntimeWindowAggregator {
  static async summary(lastHours = 24) {
    const q = `
      SELECT
        path,
        SUM(total_count) AS total,
        AVG(avg_confidence) AS avg_confidence,
        AVG(avg_risk) AS avg_risk,
        SUM(hold_count) AS hold_count
      FROM runtime_statistics_window
      WHERE window_start >= NOW() - INTERVAL '${lastHours} hours'
      GROUP BY path
      ORDER BY total DESC
    `;

    const res = await pgPool.query(q);
    return res.rows;
  }
}
