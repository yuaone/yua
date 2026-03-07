// 🔒 PHASE 15 Runtime Effect Snapshot (SSOT)
// -----------------------------------------
// - READ ONLY
// - runtime_statistics 기반
// - Adjustment 효과 비교용 스냅샷

import { pgPool } from "../../../db/postgres";

export type EffectSnapshot = {
  sampleSize: number;
  verifierFailureRate: number;
  holdRate: number;
  avgConfidence: number;
};

export const RuntimeEffectSnapshot = {
  async take(params: {
    workspaceId: string;
    scope: string;
    windowHours: number;
  }): Promise<EffectSnapshot | null> {
    const { workspaceId, scope, windowHours } = params;

    const { rows } = await pgPool.query<{
      total: number;
      verifier_failures: number;
      hold_count: number;
      avg_confidence: number;
    }>(
      `
      SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN verifier_failed THEN 1 ELSE 0 END) AS verifier_failures,
        SUM(CASE WHEN verdict = 'HOLD' THEN 1 ELSE 0 END) AS hold_count,
        AVG(confidence) AS avg_confidence
      FROM runtime_statistics
      WHERE workspace_id = $1
        AND path = $2
        AND created_at >= NOW() - ($3 || ' hours')::INTERVAL
      `,
      [workspaceId, scope, windowHours]
    );

    const r = rows[0];
    if (!r || Number(r.total) < 10) return null;

    return {
      sampleSize: Number(r.total),
      verifierFailureRate:
        Number(r.verifier_failures) / Math.max(Number(r.total), 1),
      holdRate:
        Number(r.hold_count) / Math.max(Number(r.total), 1),
      avgConfidence: Number(r.avg_confidence ?? 0),
    };
  },
};
