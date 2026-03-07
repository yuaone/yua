// 📂 src/ai/memory/repo/memory-rule-dryrun.repo.ts

import { pgPool } from "../../../db/postgres";
import type { MemoryRuleDryRunResult } from "../runtime/memory-rule-dryrun.types";

export const MemoryRuleDryRunRepo = {
  async save(params: {
    workspaceId: string;
    ruleVersion: string;
    result: MemoryRuleDryRunResult;
  }): Promise<void> {
    const { workspaceId, ruleVersion, result } = params;

    await pgPool.query(
      `
      INSERT INTO memory_rule_dry_runs (
        workspace_id,
        rule_snapshot_version,
        affected_memories,
        expected_freeze_count,
        confidence_shift_avg,
        risk_score
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [
        workspaceId,
        ruleVersion,
        result.affectedMemories,
        result.expectedFreezeCount,
        result.confidenceShiftAvg,
        result.riskScore,
      ]
    );
  },
};
