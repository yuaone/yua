// 📂 src/ai/memory/memory-rule-dryrun.engine.ts
// 🔥 PHASE 12-7 — PURE SIMULATION ENGINE

import { MemoryRecordsRepo } from "./repo/memory-records.repo";
import { MemoryRuleSnapshotRepo } from "./repo/memory-rule-snapshot.repo";
import { applyMemoryConfidenceDecay } from "./memory-confidence-decay";
import type { MemoryRuleDryRunResult } from "./runtime/memory-rule-dryrun.types";

export const MemoryRuleDryRunEngine = {
  async simulate(params: {
    workspaceId: string;
    ruleVersion: string;
  }): Promise<MemoryRuleDryRunResult> {
    const { workspaceId, ruleVersion } = params;

    const snapshot =
      await MemoryRuleSnapshotRepo.getByVersion(
        workspaceId,
        ruleVersion
      );

    if (!snapshot) {
      throw new Error("rule_snapshot_not_found");
    }

    const memories =
      await MemoryRecordsRepo.findByWorkspace(
        workspaceId
      );

    let affected = 0;
    let freezeCount = 0;
    let deltaSum = 0;

    for (const m of memories) {
      if (!m.is_active) continue;

      const decayResult =
        applyMemoryConfidenceDecay({
          candidate: {
            id: m.id,
            scope: m.scope,
            confidence: m.confidence,
          } as any,
          daysElapsed: 7, // dry-run fixed window
          usageCount: m.usage_count ?? 0,
        });

      if (decayResult.changed) {
        affected++;
        deltaSum +=
          decayResult.confidence - m.confidence;

        if (
          decayResult.confidence <
          snapshot.rules.auto_commit.min_confidence
        ) {
          freezeCount++;
        }
      }
    }

    return {
      affectedMemories: affected,
      expectedFreezeCount: freezeCount,
      confidenceShiftAvg:
        affected === 0 ? 0 : deltaSum / affected,
      riskScore:
        freezeCount / Math.max(affected, 1),
    };
  },
};
