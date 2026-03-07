import { Request, Response } from "express";
import { MemoryRuleApprovalService } from "../ai/memory/memory-rule-approval.service";
import { MemoryRuleApplyService } from "../ai/memory/memory-rule-apply.service";
import { MemoryRuleRollbackService } from "../ai/memory/memory-rule-rollback.service";
import type { MemoryRuleSnapshot } from "../ai/memory/runtime/memory-rule.types";

/**
 * 🔒 Admin Memory Rule Controller
 * - approve / reject / apply / rollback
 * - NO business logic
 * - SSOT: MemoryRule*Service
 */

type AdminRequest = Request & {
  user?: {
    email?: string;
  };
};

/**
 * 🔒 Runtime snapshot structure guard
 * - 구조 검증만 수행 (의미/정책 ❌)
 */
function assertRuleSnapshot(
  rules: unknown
): asserts rules is MemoryRuleSnapshot {
  if (
    !rules ||
    typeof rules !== "object" ||
    !("auto_commit" in rules) ||
    !("drift" in rules) ||
    !("merge" in rules) ||
    !("decay" in rules)
  ) {
    throw new Error("invalid_memory_rule_snapshot");
  }
}

export const AdminMemoryController = {
  /**
   * ✅ Rule Suggestion 승인
   */
  async approveRule(req: AdminRequest, res: Response) {
    try {
      const body = req.body as {
        workspaceId?: unknown;
        suggestionId?: unknown;
        version?: unknown;
        rules?: unknown;
      };

      if (typeof body.workspaceId !== "string") {
        return res.status(400).json({ error: "missing_workspace_id" });
      }

      if (typeof body.suggestionId !== "number") {
        return res.status(400).json({ error: "invalid_suggestion_id" });
      }

      if (typeof body.version !== "string") {
        return res.status(400).json({ error: "missing_version" });
      }

      assertRuleSnapshot(body.rules);

      const admin = req.user?.email ?? "admin";

      await MemoryRuleApprovalService.approveSuggestion({
        workspaceId: body.workspaceId,
        suggestionId: body.suggestionId,
        version: body.version,
        rules: body.rules,
        approvedBy: admin,
      });

      return res.json({ ok: true });
    } catch (err: any) {
      return res.status(500).json({
        error: err?.message ?? "approve_rule_failed",
      });
    }
  },

  /**
   * ❌ Rule Suggestion 거절
   */
  async rejectRule(req: AdminRequest, res: Response) {
    try {
      const body = req.body as {
        workspaceId?: unknown;
        suggestionId?: unknown;
        reason?: unknown;
      };

      if (typeof body.workspaceId !== "string") {
        return res.status(400).json({ error: "missing_workspace_id" });
      }

      if (typeof body.suggestionId !== "number") {
        return res.status(400).json({ error: "invalid_suggestion_id" });
      }

      const admin = req.user?.email ?? "admin";

      await MemoryRuleApprovalService.rejectSuggestion({
        workspaceId: body.workspaceId,
        suggestionId: body.suggestionId,
        rejectedBy: admin,
        reason:
          typeof body.reason === "string"
            ? body.reason
            : undefined,
      });

      return res.json({ ok: true });
    } catch (err: any) {
      return res.status(500).json({
        error: err?.message ?? "reject_rule_failed",
      });
    }
  },

  /**
   * 🔁 Approved Rule Snapshot 적용
   */
  async applyRule(req: AdminRequest, res: Response) {
    try {
      const body = req.body as {
        workspaceId?: unknown;
        toVersion?: unknown;
      };

      if (typeof body.workspaceId !== "string") {
        return res.status(400).json({ error: "missing_workspace_id" });
      }

      if (typeof body.toVersion !== "string") {
        return res.status(400).json({ error: "missing_to_version" });
      }

      const admin = req.user?.email ?? "admin";

      await MemoryRuleApplyService.applyRuleSnapshot({
        workspaceId: body.workspaceId,
        toVersion: body.toVersion,
        appliedBy: admin,
      });

      return res.json({ ok: true });
    } catch (err: any) {
      return res.status(500).json({
        error: err?.message ?? "apply_rule_failed",
      });
    }
  },

  /**
   * ⏪ Rule Snapshot Rollback
   */
  async rollbackRule(req: AdminRequest, res: Response) {
    try {
      const body = req.body as {
        workspaceId?: unknown;
        toVersion?: unknown;
        reason?: unknown;
      };

      if (typeof body.workspaceId !== "string") {
        return res.status(400).json({ error: "missing_workspace_id" });
      }

      if (typeof body.toVersion !== "string") {
        return res.status(400).json({ error: "missing_to_version" });
      }

      const admin = req.user?.email ?? "admin";

      await MemoryRuleRollbackService.rollbackRuleSnapshot({
        workspaceId: body.workspaceId,
        toVersion: body.toVersion,
        rolledBackBy: admin,
        reason:
          typeof body.reason === "string"
            ? body.reason
            : undefined,
      });

      return res.json({ ok: true });
    } catch (err: any) {
      return res.status(500).json({
        error: err?.message ?? "rollback_rule_failed",
      });
    }
  },
};
