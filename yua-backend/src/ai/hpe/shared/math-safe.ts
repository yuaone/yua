// 📂 src/ai/hpe/shared/math-safe.ts
// ------------------------------------------------------
// Safe Math Functions — Prevent NaN / Infinity / Overflow
// HPE 7.0 FINAL VERSION (safeNumber 포함)
// ------------------------------------------------------

const EPS = 1e-8;
const EXP_MAX = 700;

// 🔥 1) 안전한 Number 변환 (HPE7 전체에서 사용)
export function safeNumber(x: any): number {
  if (x === null || x === undefined) return 0;
  const n = Number(x);
  if (Number.isNaN(n) || !Number.isFinite(n)) return 0;
  return n;
}

// 🔥 2) 벡터 Norm
export function safeNorm(vec: number[]): number {
  let sum = 0;
  for (const v of vec) sum += v * v;
  const norm = Math.sqrt(sum);
  return norm < EPS ? EPS : norm;
}

// 🔥 3) Cosine Similarity
export function safeCosine(a: number[], b: number[]): number {
  const na = safeNorm(a);
  const nb = safeNorm(b);

  let dot = 0;
  for (let i = 0; i < a.length; i++) dot += a[i] * b[i];

  return dot / (na * nb);
}

// 🔥 4) L2 Distance
export function safeL2(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

// 🔥 5) Overflow-safe exp()
export function safeExp(x: number): number {
  if (x > EXP_MAX) x = EXP_MAX;
  if (x < -EXP_MAX) x = -EXP_MAX;
  return Math.exp(x);
}
