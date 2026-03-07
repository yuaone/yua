import { pgPool } from "../../../db/postgres";
import type { MemoryRuleSnapshot } from "../runtime/memory-rule.types";

export interface RuleSnapshotRow {
  id: number;
  workspace_id: string;
  version: string;
  rules: MemoryRuleSnapshot;
  approved_at: Date | null;
}

export const MemoryRuleSnapshotRepo = {
  async createSnapshot(params: {
    workspaceId: string;
    version: string;
    rules: MemoryRuleSnapshot;
    source: string;
    approvedBy?: string;
  }): Promise<RuleSnapshotRow> {
    const { workspaceId, version, rules, source, approvedBy } = params;

    const { rows } = await pgPool.query<RuleSnapshotRow>(
      `
      INSERT INTO memory_rule_snapshots
        (workspace_id, version, rules, source, approved_by, approved_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING *
      `,
      [workspaceId, version, rules, source, approvedBy ?? null]
    );

    return rows[0];
  },

  async getLatestApproved(workspaceId: string): Promise<RuleSnapshotRow | null> {
    const { rows } = await pgPool.query<RuleSnapshotRow>(
      `
      SELECT *
      FROM memory_rule_snapshots
      WHERE workspace_id = $1
        AND approved_at IS NOT NULL
      ORDER BY approved_at DESC
      LIMIT 1
      `,
      [workspaceId]
    );

    return rows[0] ?? null;
  },

  async getByVersion(
    workspaceId: string,
    version: string
  ): Promise<RuleSnapshotRow | null> {
    const { rows } = await pgPool.query<RuleSnapshotRow>(
      `
      SELECT *
      FROM memory_rule_snapshots
      WHERE workspace_id = $1
        AND version = $2
      LIMIT 1
      `,
      [workspaceId, version]
    );

    return rows[0] ?? null;
  },
};
