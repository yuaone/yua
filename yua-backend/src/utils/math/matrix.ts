// 📂 src/utils/math/matrix.ts
// 🔥 YUA-AI Matrix Utils — High-Dimensional Safe Linear Algebra (2025.12 FINAL)

import { safeNum } from "../common/vector-utils";

/* -------------------------------------------------------------
 * 1) 안전 벡터 합
 * -----------------------------------------------------------*/
export function addVec(a: number[], b: number[]): number[] {
  const len = Math.min(a.length, b.length);
  const out = new Array(len);

  for (let i = 0; i < len; i++) {
    out[i] = safeNum(a[i]) + safeNum(b[i]);
  }
  return out;
}

/* -------------------------------------------------------------
 * 2) 스칼라 곱
 * -----------------------------------------------------------*/
export function scaleVec(vec: number[], s: number): number[] {
  const ss = safeNum(s);
  return vec.map((v) => safeNum(v) * ss);
}

/* -------------------------------------------------------------
 * 3) Outer Product
 * -----------------------------------------------------------*/
export function outer(a: number[], b: number[]): number[][] {
  const rows = a.length;
  const cols = b.length;

  const M = new Array(rows);
  for (let i = 0; i < rows; i++) {
    const ai = safeNum(a[i]);
    const row = new Array(cols);

    for (let j = 0; j < cols; j++) {
      row[j] = ai * safeNum(b[j]);
    }
    M[i] = row;
  }
  return M;
}

/* -------------------------------------------------------------
 * 4) Matrix-Vector Product (A * x)
 * -----------------------------------------------------------*/
export function matVec(A: number[][], x: number[]): number[] {
  const rows = A.length;
  const cols = x.length;

  const out = new Array(rows).fill(0);

  for (let i = 0; i < rows; i++) {
    const Ai = A[i] ?? [];
    let sum = 0;

    for (let j = 0; j < cols; j++) {
      sum += safeNum(Ai[j]) * safeNum(x[j]);
    }

    out[i] = safeNum(sum);
  }

  return out;
}

/* -------------------------------------------------------------
 * 5) Matrix-Matrix Product (A * B)
 * -----------------------------------------------------------*/
export function matMul(A: number[][], B: number[][]): number[][] {
  const rows = A.length;
  const inner = B.length;
  const cols = B[0]?.length ?? 0;

  const C = new Array(rows);

  for (let i = 0; i < rows; i++) {
    const Ci = new Array(cols).fill(0);

    for (let k = 0; k < inner; k++) {
      const aik = safeNum(A[i]?.[k]);
      const Bk = B[k] ?? [];

      for (let j = 0; j < cols; j++) {
        Ci[j] += aik * safeNum(Bk[j]);
      }
    }

    C[i] = Ci;
  }

  return C;
}

/* -------------------------------------------------------------
 * 6) Identity Matrix
 * -----------------------------------------------------------*/
export function identity(n: number): number[][] {
  const I = new Array(n);

  for (let i = 0; i < n; i++) {
    const row = new Array(n).fill(0);
    row[i] = 1;
    I[i] = row;
  }

  return I;
}

/* -------------------------------------------------------------
 * 7) Transpose
 * -----------------------------------------------------------*/
export function transpose(A: number[][]): number[][] {
  const rows = A.length;
  const cols = A[0]?.length ?? 0;

  const T = new Array(cols);

  for (let j = 0; j < cols; j++) {
    const col = new Array(rows);
    for (let i = 0; i < rows; i++) {
      col[i] = safeNum(A[i]?.[j]);
    }
    T[j] = col;
  }

  return T;
}

/* -------------------------------------------------------------
 * 8) Frobenius Norm
 * -----------------------------------------------------------*/
export function froNorm(A: number[][]): number {
  let sum = 0;

  for (const row of A) {
    for (const v of row) {
      const x = safeNum(v);
      sum += x * x;
    }
  }

  return Math.sqrt(sum);
}

/* -------------------------------------------------------------
 * 9) Clamp
 * -----------------------------------------------------------*/
export function clampMat(A: number[][], min = -1, max = 1): number[][] {
  return A.map((row) =>
    row.map((v) => {
      const x = safeNum(v);
      return x < min ? min : x > max ? max : x;
    })
  );
}

/* -------------------------------------------------------------
 * 10) Diagonal Extract
 * -----------------------------------------------------------*/
export function diag(A: number[][]): number[] {
  const n = Math.min(A.length, A[0]?.length ?? 0);
  const out = new Array(n);

  for (let i = 0; i < n; i++) {
    out[i] = safeNum(A[i]?.[i]);
  }

  return out;
}

/* -------------------------------------------------------------
 * 11) Diagonal Matrix
 * -----------------------------------------------------------*/
export function diagMatrix(v: number[]): number[][] {
  const n = v.length;
  const M = new Array(n);

  for (let i = 0; i < n; i++) {
    const row = new Array(n).fill(0);
    row[i] = safeNum(v[i]);
    M[i] = row;
  }

  return M;
}
