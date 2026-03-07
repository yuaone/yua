// 📂 src/ai/hpe/hpe7/distribution.ts
// ------------------------------------------------------
// Quantile Distribution & Wasserstein Distance (Final)
// ------------------------------------------------------

import { safeNumber } from "../shared/math-safe";

export const Distribution = {
  makeQuantiles(values: number[], qCount = 64): number[] {
    if (!values.length) return new Array(qCount).fill(0);

    const sorted = [...values].sort((a, b) => a - b);

    const quantiles: number[] = [];
    for (let i = 1; i <= qCount; i++) {
      const p = i / (qCount + 1);
      const idx = Math.floor(p * (sorted.length - 1));
      quantiles.push(safeNumber(sorted[idx]));
    }
    return quantiles;
  },

  w1(a: number[], b: number[]): number {
    if (a.length !== b.length) return 999999;
    let sum = 0;
    for (let i = 0; i < a.length; i++) {
      sum += Math.abs(safeNumber(a[i]) - safeNumber(b[i]));
    }
    return safeNumber(sum);
  },

  drift(prev: number[], next: number[]): number {
    return this.w1(prev, next);
  },

  interference(a: number[], b: number[]): number {
    return this.w1(a, b);
  },

  fixOrder(dist: number[]): number[] {
    return [...dist].sort((x, y) => safeNumber(x) - safeNumber(y));
  }
};
