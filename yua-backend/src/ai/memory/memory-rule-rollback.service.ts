// 📂 src/ai/memory/memory-rule-rollback.service.ts
// 🔥 YUA Memory Rule Rollback Service — PHASE 12-9-3 SSOT
// -----------------------------------------------------
// - workspace scoped
// - rule snapshot only
// - memory data untouched
// - governance audited
// -----------------------------------------------------

import { pgPool } from "../../db/postgres";
import { MemoryRuleSnapshotRepo } from "./repo/memory-rule-snapshot.repo";
import { WorkspaceMemoryService } from "../workspace/workspace-memory.service";
import { logGovernanceEvent } from "../governance/memory-governance-audit.repo";

export class MemoryRuleRollbackError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MemoryRuleRollbackError";
  }
}

export const MemoryRuleRollbackService = {
  async rollbackRuleSnapshot(params: {
    workspaceId: string;
    toVersion: string;
    rolledBackBy: string;
    reason?: string;
  }): Promise<void> {
    const { workspaceId, toVersion, rolledBackBy, reason } = params;

    if (!workspaceId || workspaceId.trim().length < 10) {
      throw new MemoryRuleRollbackError("missing_workspace_id");
    }
    if (!toVersion) {
      throw new MemoryRuleRollbackError("missing_target_version");
    }

    await pgPool.query("BEGIN");

    try {
      const current =
        await MemoryRuleSnapshotRepo.getLatestApproved(workspaceId);

      const target =
        await MemoryRuleSnapshotRepo.getByVersion(
          workspaceId,
          toVersion
        );

      if (!target || !target.approved_at) {
        throw new MemoryRuleRollbackError(
          `target_version_not_approved: ${toVersion}`
        );
      }

      const fromVersion = current?.version ?? null;

      /* 🔒 Freeze workspace */
      await pgPool.query(
        `
        UPDATE workspace_memory_state
        SET
          is_frozen = true,
          frozen_reason = 'rule_rollback',
          frozen_at = NOW(),
          frozen_by = $2,
          updated_at = NOW()
        WHERE workspace_id = $1
          AND is_frozen = false
        `,
        [workspaceId, rolledBackBy]
      );

      await logGovernanceEvent({
        workspaceId,
        category: "FREEZE",
        message: `workspace frozen for rule rollback (${toVersion})`,
      });

      /* 🔁 Rollback log */
      await pgPool.query(
        `
        INSERT INTO memory_rule_apply_logs
          (workspace_id, from_version, to_version, action, reason, applied_by)
        VALUES ($1, $2, $3, 'ROLLBACK', $4, $5)
        `,
        [
          workspaceId,
          fromVersion,
          toVersion,
          reason ?? "manual_rollback",
          rolledBackBy,
        ]
      );

      await logGovernanceEvent({
        workspaceId,
        category: "ROLLBACK",
        message: `rule rollback: ${fromVersion ?? "none"} → ${toVersion}`,
        meta: {
          from: fromVersion,
          to: toVersion,
        },
      });

      /* 🔓 Unfreeze */
      await pgPool.query(
        `
        UPDATE workspace_memory_state
        SET
          is_frozen = false,
          frozen_reason = NULL,
          frozen_at = NULL,
          frozen_by = NULL,
          updated_at = NOW()
        WHERE workspace_id = $1
        `,
        [workspaceId]
      );

      await logGovernanceEvent({
        workspaceId,
        category: "UNFREEZE",
        message: "workspace unfrozen after rule rollback",
      });

      await pgPool.query("COMMIT");
    } catch (err) {
      await pgPool.query("ROLLBACK");

      try {
        await WorkspaceMemoryService.manualUnfreeze(
          workspaceId,
          "rollback_error"
        );
      } catch {
        /* ignore */
      }

      await logGovernanceEvent({
        workspaceId,
        category: "ROLLBACK",
        message:
          err instanceof Error
            ? err.message
            : "unknown_rollback_error",
      });

      throw err;
    }
  },
};
