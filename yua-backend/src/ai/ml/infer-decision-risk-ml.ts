// src/ai/ml/infer-path-risk-ml.ts
import type { PathType } from "../../routes/path-router";
import type { MLDecisionRisk } from "./decision-ml-bridge";
import { inferDecisionRiskML } from "./decision-ml-bridge";
import type { MLInput } from "./ml-input";

/**
 * 🔒 Path Risk ML (SSOT)
 * - Decision ML 재사용
 * - proxy 입력
 */
export async function inferPathRiskML(
  path: PathType
): Promise<MLDecisionRisk | null> {
  const proxy: MLInput = {
    domain: "SYSTEM",
    contentLength: 0,
    path,
    baseConfidence: 0.5,
    confidenceHint: 0,
    retryCount: 0,
  };

  return inferDecisionRiskML(proxy);
}


