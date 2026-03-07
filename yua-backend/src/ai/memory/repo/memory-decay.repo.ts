import { pgPool } from "../../../db/postgres";

export interface DecayStat {
  scope: string;
  avgDelta: number;
}

export async function getRecentDecayStats(params: {
  workspaceId: string;
  sinceHours?: number;
}): Promise<DecayStat[]> {
  const { workspaceId, sinceHours = 24 } = params;

  const { rows } = await pgPool.query<DecayStat>(
    `
    SELECT
      scope,
      AVG(before_confidence - after_confidence) AS "avgDelta"
    FROM memory_decay_logs
    WHERE workspace_id = $1
      AND created_at >= NOW() - ($2 || ' hours')::INTERVAL
    GROUP BY scope
    `,
    [workspaceId, sinceHours]
  );

  return rows;
}
