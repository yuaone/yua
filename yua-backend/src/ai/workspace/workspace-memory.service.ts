import { pgPool } from "../../db/postgres";

export const WorkspaceMemoryService = {
  async assertWritable(workspaceId: string): Promise<void> {
    const { rows } = await pgPool.query<{ is_frozen: boolean }>(
      `
      SELECT is_frozen
      FROM workspace_memory_state
      WHERE workspace_id = $1
      `,
      [workspaceId]
    );

    if (rows[0]?.is_frozen) {
      throw new Error("workspace_memory_frozen");
    }
  },

  async manualUnfreeze(workspaceId: string, by: string): Promise<void> {
    await pgPool.query(
      `
      UPDATE workspace_memory_state
      SET
        is_frozen = false,
        frozen_reason = NULL,
        frozen_at = NULL,
        frozen_by = $2,
        auto_unfreeze_at = NULL,
        updated_at = NOW()
      WHERE workspace_id = $1
      `,
      [workspaceId, by]
    );
  },

  async autoUnfreezeDue(): Promise<number> {
    const { rowCount } = await pgPool.query(
      `
      UPDATE workspace_memory_state
      SET
        is_frozen = false,
        frozen_reason = NULL,
        frozen_at = NULL,
        frozen_by = 'auto',
        auto_unfreeze_at = NULL,
        updated_at = NOW()
      WHERE is_frozen = true
        AND auto_unfreeze_at IS NOT NULL
        AND auto_unfreeze_at <= NOW()
      `
    );

    return rowCount ?? 0;
  },
};
