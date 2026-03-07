import { pgPool } from "../../../db/postgres";

/**
 * 🔒 Aggregated Metadata Signal (SSOT)
 * - 비식별
 * - 판단/텍스트 ❌
 * - 집계 전용
 */
export type AggregatedMetadataSignal = {
  scope: string;              // path / domain / verifier 등
  frequency: number;          // 발생 빈도
  instabilityScore: number;   // [0,1]
  recency: number;            // [0,1] (최근성)
};

export const MetadataAggregator = {
  /**
   * 🔍 Workspace 단위 메타데이터 집계
   * - learning_candidates / learning_gate 판단용
   * - READ ONLY
   */
  async aggregateWorkspace(params: {
    workspaceId: string;
    hours: number;
  }): Promise<AggregatedMetadataSignal[]> {
    const { workspaceId, hours } = params;

    /**
     * ⚠️ source tables:
     * - runtime_statistics
     * - memory_drift_logs
     * - conversation_flow_log
     *
     * 모든 값은 "요약 신호"만 사용
     */
    const { rows } = await pgPool.query(
      `
      WITH base AS (
        SELECT
          path AS scope,
          COUNT(*) AS frequency,
          AVG(
            LEAST(
              1,
              (CASE WHEN verdict = 'HOLD' THEN 0.3 ELSE 0 END)
              +
              (CASE WHEN verifier_failed THEN 0.4 ELSE 0 END)
              +
              (risk * 0.3)
            )
          ) AS instability,
          MAX(EXTRACT(EPOCH FROM (NOW() - created_at))) AS age_seconds
        FROM runtime_statistics
        WHERE workspace_id = $1
          AND created_at >= NOW() - ($2 || ' hours')::INTERVAL
        GROUP BY path
      )
      SELECT
        scope,
        frequency,
        instability AS "instabilityScore",
        LEAST(1, 1 / (age_seconds / 3600 + 1)) AS recency
      FROM base
      `,
      [workspaceId, hours]
    );

    return rows.map(r => ({
      scope: r.scope,
      frequency: Number(r.frequency),
      instabilityScore: Number(r.instabilityScore),
      recency: Number(r.recency),
    }));
  },
};
