// 🔥 YUA Memory Rule Resolver — PHASE 12-9-4 (SSOT)
// ------------------------------------------------
// 목적:
// - "지금 이 workspace에서 어떤 Rule이 실제 적용 중인가?"
// - snapshot + apply log 기준 단일 진실
// - loader / engine / api 모두 이 파일만 참조
// --------------------------------------------------

import type { MemoryRuleSnapshot } from "./memory-rule.types";
import { MemoryRuleSnapshotRepo } from "../repo/memory-rule-snapshot.repo";
import { MemoryRuleApplyRepo } from "../repo/memory-rule-apply.repo";

/* ===================================================
   Resolver
================================================== */

export const MemoryRuleResolver = {
  /**
   * 🧠 현재 workspace의 "유효 Rule Snapshot" 반환
   *
   * 결정 순서 (SSOT):
   * 1. APPLY 로그 존재 → 해당 version
   * 2. 없으면 → 최신 승인 snapshot
   */
  async resolveCurrentRule(
    workspaceId: string
  ): Promise<{
    version: string;
    rules: MemoryRuleSnapshot;
  }> {
    if (!workspaceId || workspaceId.trim().length < 10) {
      throw new Error("missing_workspace_id");
    }

    /* --------------------------------------------------
       1️⃣ APPLY 로그 기준
    -------------------------------------------------- */
    const appliedVersion =
      await MemoryRuleApplyRepo.getCurrentAppliedVersion(
        workspaceId
      );

    if (appliedVersion) {
      const snapshot =
        await MemoryRuleSnapshotRepo.getByVersion(
          workspaceId,
          appliedVersion
        );

      if (!snapshot || !snapshot.approved_at) {
        throw new Error(
          `applied_rule_snapshot_not_found: ${appliedVersion}`
        );
      }

      return {
        version: appliedVersion,
        rules: snapshot.rules,
      };
    }

    /* --------------------------------------------------
       2️⃣ fallback: 최신 승인 snapshot
    -------------------------------------------------- */
    const latest =
      await MemoryRuleSnapshotRepo.getLatestApproved(
        workspaceId
      );

    if (!latest) {
      throw new Error(
        `no_approved_rule_snapshot_for_workspace: ${workspaceId}`
      );
    }

    return {
      version: latest.version,
      rules: latest.rules,
    };
  },
};
