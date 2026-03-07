// 📂 src/ai/capability/math/math-graph-engine.ts

import {
  MathGraphResult,
  MathGraphFeatures,
} from "./math-graph-types";
import { tokenizeMath } from "./math-graph-parser";
import { extractMathFeatures } from "./math-graph-features";

export function analyzeMathGraph(
  expression: string
): MathGraphResult {
  if (!expression || expression.length > 5000) {
    return {
      features: emptyFeatures(),
      confidence: 0.3,
    };
  }

  const tokens = tokenizeMath(expression);
  const base = extractMathFeatures(tokens);

  const symbolicDensity =
    base.tokenCount === 0
      ? 0
      : base.operatorCount / base.tokenCount;

  const features: MathGraphFeatures = {
    ...base,
    symbolicDensity,
  };

  return {
    features,
    confidence: 1.0,
  };
}

function emptyFeatures(): MathGraphFeatures {
  return {
    operatorKinds: 0,
    operatorCount: 0,
    tokenCount: 0,
    maxNestingDepth: 0,
    hasIntegral: false,
    hasDerivative: false,
    hasSummation: false,
    isProofLike: false,
    symbolicDensity: 0,
  };
}
