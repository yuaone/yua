// 📂 src/ai/ml/infer-path-risk-ml.ts
import type { PathType } from "../../routes/path-router";
import type { MLDecisionRisk } from "./decision-ml-bridge";
import { inferDecisionRiskML } from "./decision-ml-bridge";
import type { MLInput } from "./ml-input";

export interface MLPathRiskInput {
  path: PathType;
  hasResearchIntent: boolean;
  hasUrl: boolean;
}

export async function inferPathRiskML(
  input: MLPathRiskInput
): Promise<MLDecisionRisk | null> {
  const proxy: MLInput = {
    path: input.path,
    baseConfidence: 0.6,
    confidenceHint: 0.6,
  };

  return inferDecisionRiskML(proxy);
}
