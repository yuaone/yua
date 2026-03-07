// 📂 src/ai/hpe/shared/vector.ts
// ------------------------------------------------------
// Vector operations used by RawScore calculation
// ------------------------------------------------------

import { safeCosine, safeL2 } from "./math-safe";

export interface RawScoreOptions {
  alpha?: number;  // cosine weight
  gamma?: number;  // L2 penalty weight
}

export function calculateRawScore(
  vA: number[],
  vB: number[],
  opts: RawScoreOptions = {}
): number {
  const alpha = opts.alpha ?? 0.7;
  const gamma = opts.gamma ?? 0.1;

  const cosine = safeCosine(vA, vB);
  const dot = vA.reduce((s, v, i) => s + v * vB[i], 0);
  const l2 = safeL2(vA, vB);

  return alpha * cosine + (1 - alpha) * dot - gamma * l2;
}
