// 📂 src/ai/capability/math/math-graph-types.ts

export interface MathGraphFeatures {
  operatorKinds: number;
  operatorCount: number;
  tokenCount: number;

  maxNestingDepth: number;

  hasIntegral: boolean;
  hasDerivative: boolean;
  hasSummation: boolean;

  isProofLike: boolean;
  symbolicDensity: number;
}

export interface MathGraphResult {
  features: MathGraphFeatures;
  confidence: number;
}
