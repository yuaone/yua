// 📂 src/ai/memory/repo/memory-snapshot.repo.ts
// 🔒 YUA Memory Snapshot Repo — PHASE 12 SSOT

import { pgPool } from "../../../db/postgres";

export type MemorySnapshotReason =
  | "merge"
  | "decay"
  | "drift"
  | "manual"
  | "rollback_guard";

export interface MemorySnapshot {
  snapshotId: number;
}

export const MemorySnapshotRepo = {
  async create(params: {
    workspaceId: string;
    reason: MemorySnapshotReason;
    triggeredBy: "system" | "admin" | "drift" | "decay";
  }): Promise<MemorySnapshot> {
    const { workspaceId, reason, triggeredBy } = params;

    if (!workspaceId) throw new Error("missing_workspace_id");

    await pgPool.query("BEGIN");

    try {
      const { rows } = await pgPool.query<{ id: number }>(
        `
        INSERT INTO memory_training_snapshots
          (workspace_id, reason, triggered_by, created_at)
        VALUES ($1, $2, $3, NOW())
        RETURNING id
        `,
        [workspaceId, reason, triggeredBy]
      );

      const snapshotId = rows[0].id;

      await pgPool.query(
        `
        INSERT INTO memory_snapshot_records (
          snapshot_id,
          memory_id,
          content,
          confidence,
          scope,
          is_active,
          merged_to,
          merged_from,
          created_at
        )
        SELECT
          $1,
          id,
          content,
          confidence,
          scope,
          is_active,
          merged_to,
          merged_from,
          NOW()
        FROM memory_records
        WHERE workspace_id = $2
        `,
        [snapshotId, workspaceId]
      );

      await pgPool.query("COMMIT");
      return { snapshotId };
    } catch (e) {
      await pgPool.query("ROLLBACK");
      throw e;
    }
  },
};
