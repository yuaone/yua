// 📂 src/ai/memory/memory-rollback.service.ts
// 🔁 YUA Memory Rollback Service — PHASE 12 SSOT

import { pgPool } from "../../db/postgres";
import { logGovernanceEvent } from "../governance/memory-governance-audit.repo";

export const MemoryRollbackService = {
  async rollbackWorkspace(params: {
    workspaceId: string;
    snapshotId: number;
    reason: string;
    by: string;
  }): Promise<void> {
    const { workspaceId, snapshotId, reason, by } = params;

    await pgPool.query("BEGIN");

    try {
      await pgPool.query(
        `DELETE FROM memory_records WHERE workspace_id = $1`,
        [workspaceId]
      );

      await pgPool.query(
        `
        INSERT INTO memory_records (
          id,
          workspace_id,
          content,
          confidence,
          scope,
          is_active,
          merged_to,
          merged_from,
          created_at,
          updated_at
        )
        SELECT
          s.memory_id,
          $1,
          s.content,
          s.confidence,
          s.scope,
          s.is_active,
          s.merged_to,
          s.merged_from,
          NOW(),
          NOW()
        FROM memory_snapshot_records s
        WHERE s.snapshot_id = $2
        `,
        [workspaceId, snapshotId]
      );

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

      await logGovernanceEvent({
        workspaceId,
        category: "ROLLBACK",
        refId: snapshotId,
        message: `Rollback executed: ${reason}`,
        meta: { by },
      });

      await pgPool.query("COMMIT");
    } catch (e) {
      await pgPool.query("ROLLBACK");
      throw e;
    }
  },
};
