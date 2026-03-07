// 📂 src/utils/math/crlb.ts
// 🔥 YUA-AI CRLB Core — Fisher-Inverse Trace / Stability Metrics (2025.12)
// -------------------------------------------------------------------------
// - CRLB(Var ≥ F^{-1}) 근사 계산
// - Diagonal / Block-diagonal Fisher 지원
// - Hutchinson Trace 기반 고차원 안정 처리
// - StabilityKernel / Omega-Lite / Gen5.9 공통 사용
// -------------------------------------------------------------------------

import { safeNum } from "../common/vector-utils";
import {
  invertFisherDiagonal,
  fisherDiagMatVec,
  fisherBlockMatVec,
  hutchinsonTrace
} from "./fisher";

/* -------------------------------------------------------------
 * 1) CRLB for Diagonal Fisher: var_i ≥ 1 / F_i
 * -----------------------------------------------------------*/
export function crlbDiagonal(diagF: number[]): number[] {
  return invertFisherDiagonal(diagF, 1e-8, 1e6); // (min, max clamp)
}

/* -------------------------------------------------------------
 * 2) CRLB Trace for Diagonal Fisher
 *    Tr(F^{-1})
 * -----------------------------------------------------------*/
export function crlbTraceDiagonal(diagF: number[]): number {
  const inv = invertFisherDiagonal(diagF);
  return inv.reduce((sum, v) => sum + safeNum(v), 0);
}

/* -------------------------------------------------------------
 * 3) CRLB Trace for Block-Diagonal Fisher
 * -----------------------------------------------------------*/
export function crlbTraceBlock(blocks: number[][][]): number {
  let total = 0;

  for (const block of blocks) {
    const dim = block.length;

    // Hutchinson trace using block matvec
    const matVec = (v: number[]) => fisherBlockMatVec([block], v, dim);

    const t = hutchinsonTrace(matVec, dim, 12);
    total += safeNum(t);
  }

  return total;
}

/* -------------------------------------------------------------
 * 4) High-dimensional CRLB Trace using Hutchinson
 * -----------------------------------------------------------*/
export function crlbTraceHutchinson(
  fisherMatVecFn: (v: number[]) => number[],
  dim: number,
  samples = 16
) {
  return hutchinsonTrace(fisherMatVecFn, dim, samples);
}

/* -------------------------------------------------------------
 * 5) Stability Score from CRLB
 *    score = 1 / (1 + Tr(F^{-1}))
 * -----------------------------------------------------------*/
export function crlbStabilityScore(trace: number) {
  const t = safeNum(trace);
  return 1 / (1 + t);
}

/* -------------------------------------------------------------
 * 6) CRLB 안전 Clamping
 * -----------------------------------------------------------*/
export function clampCRLB(value: number, max = 1e6) {
  if (!Number.isFinite(value)) return max;
  return value > max ? max : value;
}


// -------------------------------------------------------------
// Wrapper for StabilityKernel compatibility
// -------------------------------------------------------------
export function estimateCRLBTrace(fisherValue: number | number[][][] ): number {
  if (typeof fisherValue === "number") {
    // simple diagonal case: scalar fisherTrace
    return fisherValue < 1e-12 ? 1e6 : 1 / fisherValue;
  }
  // block-diagonal case
  try {
    return crlbTraceBlock(fisherValue);
  } catch {
    return 1;
  }
}
