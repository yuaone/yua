// 🔥 YUA Memory Rule Apply Service — PHASE 12-8 SSOT
// -------------------------------------------------
// - workspace scoped
// - snapshot based
// - freeze protected
// - rollback safe
// - governance audited
// -------------------------------------------------

import { pgPool } from "../../db/postgres";
import { MemoryRuleSnapshotRepo } from "./repo/memory-rule-snapshot.repo";
import { WorkspaceMemoryService } from "../workspace/workspace-memory.service";
import { logGovernanceEvent } from "../governance/memory-governance-audit.repo";
import type { MemoryRuleSnapshot } from "./runtime/memory-rule.types";
import {
  invalidateMemoryRuleCache
} from "./runtime/memory-rule-loader";

export class MemoryRuleApplyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MemoryRuleApplyError";
  }
}

export const MemoryRuleApplyService = {
  /**
   * ✅ Apply approved rule snapshot
   * - FREEZE workspace
   * - validate versions
   * - audit log
   */
  async applyRuleSnapshot(params: {
    workspaceId: string;
    toVersion: string;
    appliedBy: string;
  }): Promise<void> {
    const { workspaceId, toVersion, appliedBy } = params;

    if (!workspaceId || workspaceId.trim().length < 10) {
      throw new MemoryRuleApplyError("missing_workspace_id");
    }
    if (!toVersion) {
      throw new MemoryRuleApplyError("missing_target_version");
    }

    await pgPool.query("BEGIN");

    try {
      /* --------------------------------------------------
         1️⃣ Load snapshots
      -------------------------------------------------- */
      const current =
        await MemoryRuleSnapshotRepo.getLatestApproved(workspaceId);

      const target =
        await MemoryRuleSnapshotRepo.getByVersion(
          workspaceId,
          toVersion
        );

      if (!target || !target.approved_at) {
        throw new MemoryRuleApplyError(
          `target_version_not_approved: ${toVersion}`
        );
      }

      const fromVersion = current?.version ?? null;

      /* --------------------------------------------------
         2️⃣ Freeze workspace
      -------------------------------------------------- */
      await pgPool.query(
        `
        UPDATE workspace_memory_state
        SET
          is_frozen = true,
          frozen_reason = 'rule_apply',
          frozen_at = NOW(),
          frozen_by = $2,
          updated_at = NOW()
        WHERE workspace_id = $1
          AND is_frozen = false
        `,
        [workspaceId, appliedBy]
      );

      await logGovernanceEvent({
        workspaceId,
        category: "FREEZE",
        message: `workspace frozen for rule apply (${toVersion})`,
      });

      invalidateMemoryRuleCache(workspaceId);

      /* --------------------------------------------------
         3️⃣ Apply log
         (실제 rule은 Loader에서 snapshot 기준 참조)
      -------------------------------------------------- */
      await pgPool.query(
        `
        INSERT INTO memory_rule_apply_logs
          (workspace_id, from_version, to_version, action, reason, applied_by)
        VALUES ($1, $2, $3, 'APPLY', 'admin_apply', $4)
        `,
        [workspaceId, fromVersion, toVersion, appliedBy]
      );

      await logGovernanceEvent({
        workspaceId,
        category: "APPLY",
        message: `rule applied: ${fromVersion ?? "none"} → ${toVersion}`,
        meta: {
          from: fromVersion,
          to: toVersion,
        },
      });

      /* --------------------------------------------------
         4️⃣ Unfreeze workspace
      -------------------------------------------------- */
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
        message: "workspace unfrozen after rule apply",
      });

      await pgPool.query("COMMIT");
    } catch (err) {
      await pgPool.query("ROLLBACK");

      /* --------------------------------------------------
         🔥 FAIL-SAFE: 강제 Unfreeze
      -------------------------------------------------- */
      try {
        await WorkspaceMemoryService.manualUnfreeze(
          workspaceId,
          "apply_error"
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
            : "unknown_apply_error",
      });

      throw err;
    }
  },
};
