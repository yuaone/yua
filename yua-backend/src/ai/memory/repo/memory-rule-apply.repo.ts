// 🔥 YUA Memory Rule Apply Repository — PHASE 12-9-3
// --------------------------------------------------
// - read-only
// - workspace scoped
// - APPLY / ROLLBACK 이력 조회
// - governance-safe
// --------------------------------------------------

import { pgPool } from "../../../db/postgres";

/* ===================================================
   Types
================================================== */

export type RuleApplyAction = "APPLY" | "ROLLBACK";

export interface MemoryRuleApplyLog {
  id: number;
  workspaceId: string;
  fromVersion: string | null;
  toVersion: string;
  action: RuleApplyAction;
  reason: string | null;
  appliedBy: string;
  appliedAt: Date;
}

/* ===================================================
   Repository
================================================== */

export const MemoryRuleApplyRepo = {
  /**
   * 📜 전체 Rule Apply / Rollback 이력 조회
   */
  async getHistory(workspaceId: string): Promise<MemoryRuleApplyLog[]> {
    const { rows } = await pgPool.query<MemoryRuleApplyLog>(
      `
      SELECT
        id,
        workspace_id       AS "workspaceId",
        from_version       AS "fromVersion",
        to_version         AS "toVersion",
        action,
        reason,
        applied_by         AS "appliedBy",
        applied_at         AS "appliedAt"
      FROM memory_rule_apply_logs
      WHERE workspace_id = $1
      ORDER BY applied_at DESC
      `,
      [workspaceId]
    );

    return rows;
  },

  /**
   * 🧠 현재 유효한 Rule Version 결정
   * - 가장 마지막 APPLY 기준
   */
  async getCurrentAppliedVersion(
    workspaceId: string
  ): Promise<string | null> {
    const { rows } = await pgPool.query<{
      toVersion: string;
    }>(
      `
      SELECT to_version AS "toVersion"
      FROM memory_rule_apply_logs
      WHERE workspace_id = $1
        AND action = 'APPLY'
      ORDER BY applied_at DESC
      LIMIT 1
      `,
      [workspaceId]
    );

    return rows[0]?.toVersion ?? null;
  },
};
