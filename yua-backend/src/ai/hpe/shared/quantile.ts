// 📂 src/ai/hpe/shared/quantile.ts
// ------------------------------------------------------
// Quantile Utilities for Distributional RL (W1 Distance)
// HPE 7.0 FINAL VERSION — 배열 기반으로 통일
// ------------------------------------------------------

import { QuantileDistribution } from "../hpe7/hpe7-protocol";

// 내부에서 QuantileDistribution을 number[]로 변환
function asArray(q: QuantileDistribution): number[] {
  return Array.isArray(q)
    ? q as unknown as number[]
    : q.quantiles ?? [];
}

// Ensure quantile array is sorted
export function ensureSorted(q: QuantileDistribution): number[] {
  const arr = asArray(q);
  return [...arr].sort((a, b) => a - b);
}

// Wasserstein-1 distance
export function w1Distance(
  a: QuantileDistribution,
  b: QuantileDistribution
): number {
  const A = asArray(a);
  const B = asArray(b);

  if (A.length !== B.length) {
    throw new Error("Quantile distributions must have same length");
  }

  let sum = 0;
  for (let i = 0; i < A.length; i++) {
    sum += Math.abs(A[i] - B[i]);
  }
  return sum;
}

// Weighted blending
export function blendQuantiles(
  base: QuantileDistribution,
  target: QuantileDistribution,
  weight = 0.5
): number[] {
  const A = asArray(base);
  const B = asArray(target);

  const w = Math.min(1, Math.max(0, weight));
  return A.map((v, i) => v * (1 - w) + B[i] * w);
}
