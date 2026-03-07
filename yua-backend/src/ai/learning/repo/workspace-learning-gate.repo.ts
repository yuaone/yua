import { pgPool } from "../../../db/postgres";

export const WorkspaceLearningGateRepo = {
  async upsert(params: {
    workspaceId: string;
    eligible: boolean;
    reason?: string;
  }): Promise<void> {
    const { workspaceId, eligible, reason } = params;

    await pgPool.query(
      `
      INSERT INTO workspace_learning_gate
        (workspace_id, eligible, reason, last_evaluated_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      ON CONFLICT (workspace_id)
      DO UPDATE SET
        eligible = EXCLUDED.eligible,
        reason = EXCLUDED.reason,
        last_evaluated_at = NOW(),
        updated_at = NOW()
      `,
      [workspaceId, eligible, reason ?? null]
    );
  },

  async isEligible(workspaceId: string): Promise<boolean> {
    const { rows } = await pgPool.query<{ eligible: boolean }>(
      `
      SELECT eligible
      FROM workspace_learning_gate
      WHERE workspace_id = $1
      `,
      [workspaceId]
    );

    return rows[0]?.eligible === true;
  },
};
