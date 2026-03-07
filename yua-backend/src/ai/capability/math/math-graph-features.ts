// 📂 src/ai/capability/math/math-graph-features.ts

import { MathToken } from "./math-graph-parser";

export function extractMathFeatures(
  tokens: MathToken[]
) {
  let depth = 0;
  let maxDepth = 0;

  const operatorSet = new Set<string>();
  let operatorCount = 0;

  let hasIntegral = false;
  let hasDerivative = false;
  let hasSummation = false;
  let isProofLike = false;

  for (const t of tokens) {
    if (t.type === "paren") {
      if (t.value === "(") depth++;
      if (t.value === ")") depth--;
      maxDepth = Math.max(maxDepth, depth);
    }

    if (t.type === "operator") {
      operatorSet.add(t.value);
      operatorCount++;
    }

    if (t.type === "symbol") {
      if (/∫|integral|적분/i.test(t.value))
        hasIntegral = true;
      if (/d\/dx|미분|derivative/i.test(t.value))
        hasDerivative = true;
      if (/Σ|sum|시그마/i.test(t.value))
        hasSummation = true;

      if (
        /(assume|therefore|hence|proof|증명)/i.test(
          t.value
        )
      ) {
        isProofLike = true;
      }
    }
  }

  return {
    operatorKinds: operatorSet.size,
    operatorCount,
    tokenCount: tokens.length,
    maxNestingDepth: maxDepth,
    hasIntegral,
    hasDerivative,
    hasSummation,
    isProofLike,
  };
}
