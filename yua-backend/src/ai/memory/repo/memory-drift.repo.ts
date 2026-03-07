import { pgPool } from "../../../db/postgres";

export interface DriftLogStat {
  scope: string;
  highCount: number;
}

export async function getRecentDriftStats(params: {
  workspaceId: string;
  sinceHours?: number;
}): Promise<DriftLogStat[]> {
  const { workspaceId, sinceHours = 24 } = params;

  const { rows } = await pgPool.query<DriftLogStat>(
    `
    SELECT
      r.scope,
      COUNT(*) FILTER (WHERE d.drift_status = 'HIGH') AS "highCount"
    FROM memory_drift_logs d
    JOIN memory_records r ON r.id = d.memory_id
    WHERE d.workspace_id = $1
      AND d.created_at >= NOW() - ($2 || ' hours')::INTERVAL
    GROUP BY r.scope
    `,
    [workspaceId, sinceHours]
  );

  return rows;
}
