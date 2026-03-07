// 🔒 PHASE 7.5 Runtime Statistics Aggregator (SSOT)

import { pgPool } from "../../db/postgres";

/**
 * ⚠️ 운영 / 분석 / 배치 전용
 * - 런타임 판단 ❌
 * - UI 직접 연결 ❌
 */
export class RuntimeStatsAggregator {
  static async summary(lastHours = 24) {
    const q = `
      SELECT
        path,
        COUNT(*) AS total,
        AVG(confidence) AS avg_confidence,
        AVG(risk) AS avg_risk,
        AVG(tool_score) AS avg_tool_score,
        SUM(CASE WHEN verifier_failed THEN 1 ELSE 0 END) AS verifier_failures,
        SUM(CASE WHEN verdict='HOLD' THEN 1 ELSE 0 END) AS hold_count
      FROM runtime_statistics
      WHERE created_at >= NOW() - INTERVAL '${lastHours} hours'
      GROUP BY path
      ORDER BY total DESC
    `;

    const res = await pgPool.query(q);
    return res.rows;
  }
}
