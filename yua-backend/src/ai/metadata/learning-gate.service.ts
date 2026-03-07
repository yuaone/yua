// 🔒 Learning Gate Evaluator — PHASE 12-9-5 (SSOT)
// -----------------------------------------------
// PHASE 13 진입 조건만 판단

import { MetadataAggregator } from "./metadata-aggregator";
import { WorkspaceLearningGateRepo } from "../learning/repo/workspace-learning-gate.repo";

export const LearningGateService = {
  async evaluateWorkspace(params: {
    workspaceId: string;
    minSamples: number;
  }): Promise<boolean> {
    const { workspaceId, minSamples } = params;

    const aggregated =
      await MetadataAggregator.aggregateWorkspace({
        workspaceId,
        hours: 72,
      });

    const totalSamples = aggregated.reduce(
      (a, s) => a + s.frequency,
      0
    );

    const eligible = totalSamples >= minSamples;

    await WorkspaceLearningGateRepo.upsert({
      workspaceId,
      eligible,
      reason: eligible
        ? "sufficient_metadata_samples"
        : "insufficient_samples",
    });

    return eligible;
  },
};
