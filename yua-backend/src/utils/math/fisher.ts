// 📂 src/utils/math/fisher.ts
// 🔥 YUA-AI Fisher Information Core — FINAL FIXED 2026

import { safeNum } from "../common/vector-utils";
import { matVec } from "./matrix";

/* -------------------------------------------------------------
 * 1) Diagonal Fisher Approx (E[g ⊙ g])
 * -----------------------------------------------------------*/
export function fisherDiagonal(grads: number[][]): number[] {
  if (!grads.length) return [];

  const dim = grads[0].length;
  const out = new Array(dim).fill(0);

  for (const g of grads) {
    for (let i = 0; i < dim; i++) {
      const v = safeNum(g[i]);
      out[i] += v * v;
    }
  }

  const scale = 1 / grads.length;
  for (let i = 0; i < dim; i++) out[i] = safeNum(out[i] * scale);

  return out;
}

/* -------------------------------------------------------------
 * 2) Block-Diagonal Fisher Approx
 * -----------------------------------------------------------*/
export function fisherBlockDiagonal(
  grads: number[][],
  blockSize = 64
): number[][][] {
  if (!grads.length) return [];

  const dim = grads[0].length;
  const blocks: number[][][] = [];

  for (let start = 0; start < dim; start += blockSize) {
    const end = Math.min(start + blockSize, dim);
    const size = end - start;

    const B = new Array(size).fill(0).map(() => new Array(size).fill(0));

    for (const g of grads) {
      for (let i = 0; i < size; i++) {
        const gi = safeNum(g[start + i]);
        for (let j = 0; j < size; j++) {
          const gj = safeNum(g[start + j]);
          B[i][j] += gi * gj;
        }
      }
    }

    const s = 1 / grads.length;
    for (let i = 0; i < size; i++)
      for (let j = 0; j < size; j++) B[i][j] = safeNum(B[i][j] * s);

    blocks.push(B);
  }

  return blocks;
}

/* -------------------------------------------------------------
 * 3) Hutchinson Trace Estimator
 * -----------------------------------------------------------*/
export function hutchinsonTrace(
  matVecFn: (v: number[]) => number[],
  dim: number,
  samples = 16
): number {
  let total = 0;

  for (let s = 0; s < samples; s++) {
    const r = new Array(dim).fill(0).map(() => (Math.random() < 0.5 ? -1 : 1));
    const Fr = matVecFn(r);

    let v = 0;
    for (let i = 0; i < dim; i++) {
      v += safeNum(Fr[i]) * safeNum(r[i]);
    }
    total += v;
  }

  return safeNum(total / samples);
}

/* -------------------------------------------------------------
 * 4) Inverse of Diagonal Fisher
 * -----------------------------------------------------------*/
export function invertFisherDiagonal(
  diag: number[],
  eps = 1e-8,
  clampMax = 1e6
): number[] {
  return diag.map((v) => {
    const x = safeNum(v);
    if (x <= eps) return clampMax;
    const inv = 1 / x;
    return inv > clampMax ? clampMax : inv;
  });
}

/* -------------------------------------------------------------
 * 5) Diagonal Fisher Fv
 * -----------------------------------------------------------*/
export function fisherDiagMatVec(diag: number[], v: number[]): number[] {
  const out = new Array(diag.length);

  for (let i = 0; i < diag.length; i++) {
    out[i] = safeNum(diag[i]) * safeNum(v[i]);
  }

  return out;
}

/* -------------------------------------------------------------
 * 6) Block-Diagonal Fv
 * -----------------------------------------------------------*/
export function fisherBlockMatVec(
  blocks: number[][][],
  v: number[],
  blockSize = 64
): number[] {
  const out = new Array(v.length).fill(0);

  let offset = 0;
  for (const B of blocks) {
    const size = B.length;
    const sub = v.slice(offset, offset + size);
    const res = matVec(B, sub);

    for (let i = 0; i < size; i++) {
      out[offset + i] = safeNum(res[i]);
    }
    offset += size;
  }

  return out;
}

/* -------------------------------------------------------------
 * 7) computeFisherBlock — StabilityKernel 전용 (단일 버전)
 * -----------------------------------------------------------*/
export function computeFisherBlock(x: number[][]): number {
  if (!x.length) return 1;

  const diag = fisherDiagonal(x);
  return diag.reduce((a, b) => a + safeNum(b), 0);
}
