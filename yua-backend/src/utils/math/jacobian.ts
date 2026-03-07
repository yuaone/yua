// 📂 src/utils/math/jacobian.ts
// 🔥 YUA-AI Jacobian Core — FINAL BUILD 2025.12

import { safeNum } from "../common/vector-utils";

/* -------------------------------------------------------------
 * 1) Jacobian-Vector Product (Jv)
 * -----------------------------------------------------------*/
export function jacobianVectorProduct(
  f: (x: number[]) => number[],
  x: number[],
  v: number[],
  eps = 1e-4
): number[] {
  const dim = x.length;
  const xp = new Array(dim);

  for (let i = 0; i < dim; i++) {
    xp[i] = safeNum(x[i]) + eps * safeNum(v[i]);
  }

  const fx = f(x);
  const fxp = f(xp);

  const out = new Array(dim);
  for (let i = 0; i < dim; i++) {
    out[i] = safeNum(fxp[i]) - safeNum(fx[i]);
    out[i] /= eps;
  }
  return out;
}

export function vecNorm(v: number[]): number {
  let s = 0;
  for (const x of v) s += safeNum(x) ** 2;
  return Math.sqrt(s);
}

export function normalize(v: number[]): number[] {
  const n = vecNorm(v);
  if (n < 1e-12) return v.map(() => 0);
  return v.map((x) => safeNum(x) / n);
}

/* -------------------------------------------------------------
 * 2) Spectral Norm (Power Iteration)
 * -----------------------------------------------------------*/
export function spectralNorm(
  f: (x: number[]) => number[],
  x: number[],
  iters = 10
): number {
  const dim = x.length;

  // ✅ FIX: v 는 number[] 로 선언
  let v: number[] = new Array(dim).fill(0).map(() => (Math.random() < 0.5 ? -1 : 1));

  for (let i = 0; i < iters; i++) {
    const Jv = jacobianVectorProduct(f, x, v);
    const n = vecNorm(Jv);

    if (n < 1e-9) return 0;
    v = normalize(Jv);  // 이제 TS 오류 없음
  }

  return vecNorm(jacobianVectorProduct(f, x, v));
}

/* -------------------------------------------------------------
 * 3) StabilityKernel 맞춤 Jacobian Norm
 * -----------------------------------------------------------*/
export function jacobianNorm(grads: number[][]): number {
  if (!grads.length) return 0;

  const dim = grads[0].length;
  const v = new Array(dim).fill(1 / Math.sqrt(dim));

  const gsum = new Array(dim).fill(0);

  for (const g of grads) {
    for (let i = 0; i < dim; i++) {
      gsum[i] += safeNum(g[i]) * v[i];
    }
  }

  return vecNorm(gsum);
}

/* -------------------------------------------------------------
 * 4) Lipschitz Clamp / Contraction
 * -----------------------------------------------------------*/
export const clampLipschitz = (L: number, maxL = 50) =>
  !Number.isFinite(L) ? maxL : L > maxL ? maxL : L;

export const isContraction = (L: number) => safeNum(L) < 1;
