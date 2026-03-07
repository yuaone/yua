// 📂 src/utils/common/vector-utils.ts
// 🔥 YUA-AI Vector Utils — ENTERPRISE SAFE MATH (2025.12)

export const DEFAULT_DIM = 1536;

/* -------------------------------------------------------------
 * 1) 안전 숫자 변환
 * -----------------------------------------------------------*/
export function safeNum(n: any): number {
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}

/* -------------------------------------------------------------
 * 2) 차원 보정
 * -----------------------------------------------------------*/
export function ensureDim(vec: number[], dim = DEFAULT_DIM): number[] {
  if (!Array.isArray(vec)) return new Array(dim).fill(0);

  if (vec.length === dim) return vec.map(safeNum);

  if (vec.length < dim) {
    const padded = [...vec.map(safeNum)];
    while (padded.length < dim) padded.push(0);
    return padded;
  }

  return vec.slice(0, dim).map(safeNum);
}

/* -------------------------------------------------------------
 * 3) Normalize
 * -----------------------------------------------------------*/
export function normalize(vec: number[]): number[] {
  let sum = 0;

  for (let i = 0; i < vec.length; i++) {
    const v = safeNum(vec[i]);
    sum += v * v;
  }

  if (sum === 0) return new Array(vec.length).fill(0);

  const norm = Math.sqrt(sum);
  return vec.map((v) => safeNum(v) / norm);
}

/* -------------------------------------------------------------
 * 4) Dot Product
 * -----------------------------------------------------------*/
export function dot(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let s = 0;

  for (let i = 0; i < len; i++) {
    s += safeNum(a[i]) * safeNum(b[i]);
  }
  return s;
}

/* -------------------------------------------------------------
 * 5) L2 Norm
 * -----------------------------------------------------------*/
export function l2Norm(vec: number[]): number {
  return Math.sqrt(dot(vec, vec));
}

/* -------------------------------------------------------------
 * 6) Cosine Similarity
 * -----------------------------------------------------------*/
export function cosineSim(a: number[], b: number[]): number {
  const na = l2Norm(a);
  const nb = l2Norm(b);

  if (na === 0 || nb === 0) return 0;

  return dot(a, b) / (na * nb);
}

/* -------------------------------------------------------------
 * 7) Cosine Distance
 * -----------------------------------------------------------*/
export function cosineDistance(a: number[], b: number[]): number {
  return 1 - cosineSim(a, b);
}

/* -------------------------------------------------------------
 * 8) L2 Distance
 * -----------------------------------------------------------*/
export function l2Distance(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let s = 0;

  for (let i = 0; i < len; i++) {
    const diff = safeNum(a[i]) - safeNum(b[i]);
    s += diff * diff;
  }

  return Math.sqrt(s);
}

/* -------------------------------------------------------------
 * 9) Clamp Vec
 * -----------------------------------------------------------*/
export function clampVec(
  vec: number[],
  min = -1,
  max = 1
): number[] {
  return vec.map((v) => {
    const n = safeNum(v);
    return n < min ? min : n > max ? max : n;
  });
}

/* -------------------------------------------------------------
 * 10) Merge Vectors
 * -----------------------------------------------------------*/
export function mergeVectors(
  a: number[],
  b: number[],
  wA = 0.5,
  wB = 0.5
): number[] {
  const len = Math.min(a.length, b.length);
  const out = new Array(len);

  for (let i = 0; i < len; i++) {
    out[i] = safeNum(a[i]) * wA + safeNum(b[i]) * wB;
  }

  return out;
}

/* -------------------------------------------------------------
 * 11) Average Vectors
 * -----------------------------------------------------------*/
export function averageVectors(list: number[][]): number[] {
  if (!list.length) return new Array(DEFAULT_DIM).fill(0);

  const dim = list[0].length;
  const acc = new Array(dim).fill(0);

  for (const v of list) {
    for (let i = 0; i < dim; i++) {
      acc[i] += safeNum(v[i]);
    }
  }

  return acc.map((v) => v / list.length);
}

/* -------------------------------------------------------------
 * 12) Safe Vec
 * -----------------------------------------------------------*/
export function safeVec(vec: any): number[] {
  if (!Array.isArray(vec)) return [];
  return vec.map((v) => safeNum(v));
}

/* -------------------------------------------------------------
 * ⭐ YUA-ENGINE 호환 alias 추가 (옛 엔진 코드 지원)
 * -----------------------------------------------------------*/

// 엔진에서 사용: cosineSimilarity
export const cosineSimilarity = cosineSim;

// 엔진에서 사용: normalizeVec
export const normalizeVec = normalize;

// 엔진에서 사용: safeNormalize (이름만 alias)
export const safeNormalize = normalize;
