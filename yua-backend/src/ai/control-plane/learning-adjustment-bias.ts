// 🔒 Learning Adjustment Bias Resolver (SSOT)
// -------------------------------------------
// - READ ONLY
// - Decision / Judgment 보조 신호 ONLY

import { LearningAdjustmentRepo } from "../learning/repo/learning-adjustment.repo";

export type MetaThresholdBias = {
  confidenceCutDelta?: number; // ex: -0.05
};

export async function resolveLearningBias(params: {
  workspaceId: string;
  scope: string;
}): Promise<MetaThresholdBias | null> {
  const { workspaceId, scope } = params;

  const adj =
    await LearningAdjustmentRepo.getLatestAppliedByScope({
      workspaceId,
      scope,
    });

  if (!adj) return null;

  switch (adj.adjustment_type) {
    case "confidence_calibration":
      return {
        confidenceCutDelta:
          typeof adj.payload?.suggestedWeight === "number"
            ? -Math.min(0.1, adj.payload.suggestedWeight)
            : undefined,
      };

    default:
      return null;
  }
}
