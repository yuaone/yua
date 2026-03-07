import { pgPool } from "../../db/postgres";
import { MemoryRuleSnapshotRepo } from "./repo/memory-rule-snapshot.repo";
import { logGovernanceEvent } from "../governance/memory-governance-audit.repo";
import type { MemoryRuleSnapshot } from "./runtime/memory-rule.types";

export const MemoryRuleApprovalService = {
  async approveSuggestion(params: {
    workspaceId: string;
    suggestionId: number;
    version: string;
    rules: MemoryRuleSnapshot;
    approvedBy: string;
  }): Promise<void> {
    const {
      workspaceId,
      suggestionId,
      version,
      rules,
      approvedBy,
    } = params;

    await pgPool.query("BEGIN");

    try {
      // 🔒 suggestion 상태 검증
      const { rows } = await pgPool.query<{
        status: string;
      }>(
        `
        SELECT status
        FROM memory_rule_suggestions
        WHERE id = $1 AND workspace_id = $2
        `,
        [suggestionId, workspaceId]
      );

      if (!rows.length) {
        throw new Error("rule_suggestion_not_found");
      }
      if (rows[0].status !== "PENDING") {
        throw new Error("rule_suggestion_not_pending");
      }

      // 🔒 snapshot 생성
      await MemoryRuleSnapshotRepo.createSnapshot({
        workspaceId,
        version,
        rules,
        source: "admin",
        approvedBy,
      });

      // 🔒 suggestion 승인 처리
      await pgPool.query(
        `
        UPDATE memory_rule_suggestions
        SET
          status = 'APPROVED',
          decided_at = NOW(),
          decided_by = $2
        WHERE id = $1
        `,
        [suggestionId, approvedBy]
      );

      // 🔒 감사 로그
      await logGovernanceEvent({
        workspaceId,
        category: "APPROVAL",
        refId: suggestionId,
        message: `Rule snapshot approved: ${version}`,
        meta: {
          version,
          approvedBy,
        },
      });

      await pgPool.query("COMMIT");
    } catch (e) {
      await pgPool.query("ROLLBACK");
      throw e;
    }
  },

  async rejectSuggestion(params: {
    workspaceId: string;
    suggestionId: number;
    rejectedBy: string;
    reason?: string;
  }): Promise<void> {
    const { workspaceId, suggestionId, rejectedBy, reason } = params;

    await pgPool.query("BEGIN");

    try {
      await pgPool.query(
        `
        UPDATE memory_rule_suggestions
        SET
          status = 'REJECTED',
          decided_at = NOW(),
          decided_by = $2
        WHERE id = $1 AND workspace_id = $3
        `,
        [suggestionId, rejectedBy, workspaceId]
      );

      await logGovernanceEvent({
        workspaceId,
        category: "APPROVAL",
        refId: suggestionId,
        message: reason ?? "Rule suggestion rejected",
        meta: {
          rejectedBy,
        },
      });

      await pgPool.query("COMMIT");
    } catch (e) {
      await pgPool.query("ROLLBACK");
      throw e;
    }
  },
};
