// 📂 src/ai/memory/repo/get-recent-drift-stats.ts
// 🔒 PHASE 13-1 Drift Aggregation Repo (SSOT)

import { pgPool } from "../../../db/postgres";

export type DriftStat = {
  scope: string;
  highCount: number;
};

export async function getRecentDriftStats(params: {
  workspaceId: string;
  sinceHours?: number;
}): Promise<DriftStat[]> {
  const { workspaceId, sinceHours = 24 } = params;

  const { rows } = await pgPool.query<DriftStat>(
    `
    SELECT
      r.scope AS scope,
      COUNT(*) FILTER (
        WHERE d.drift_status = 'HIGH'
      ) AS "highCount"
    FROM memory_drift_logs d
    JOIN memory_records r
      ON r.id = d.memory_id
    WHERE d.workspace_id = $1
      AND d.created_at >= NOW() - ($2 || ' hours')::INTERVAL
    GROUP BY r.scope
    `,
    [workspaceId, sinceHours]
  );

  return rows;
}
