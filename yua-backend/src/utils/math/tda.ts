// 📂 src/utils/math/tda.ts
// 🔥 YUA-AI TDA Core — FINAL BUILD 2025.12

import { safeNum } from "../common/vector-utils";

/* -------------------------------------------------------------
 * 1) Euclidean Distance (safe)
 * -----------------------------------------------------------*/
export function dist(a: number[], b: number[]): number {
  let s = 0;
  const len = Math.min(a.length, b.length);

  for (let i = 0; i < len; i++) {
    const d = safeNum(a[i]) - safeNum(b[i]);
    s += d * d;
  }
  return Math.sqrt(s);
}

/* -------------------------------------------------------------
 * 2) Alpha Filter (boundary approx)
 * -----------------------------------------------------------*/
export function alphaFilter(points: number[][], alpha: number): number[][] {
  const out: number[][] = [];
  const N = points.length;

  if (N <= 2) return points;

  for (let i = 0; i < N; i++) {
    let ok = false;
    for (let j = 0; j < N; j++) {
      if (i === j) continue;
      if (dist(points[i], points[j]) < alpha) {
        ok = true;
        break;
      }
    }
    if (ok) out.push(points[i]);
  }

  return out;
}

/* -------------------------------------------------------------
 * 3) Rips 1-skeleton
 * -----------------------------------------------------------*/
export function ripsEdges(
  points: number[][],
  eps: number
): Array<[number, number]> {
  const edges: Array<[number, number]> = [];
  const N = points.length;

  for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
      if (dist(points[i], points[j]) <= eps) edges.push([i, j]);
    }
  }
  return edges;
}

/* -------------------------------------------------------------
 * 4) Connected Components (H0)
 * -----------------------------------------------------------*/
export function connectedComponents(
  edges: Array<[number, number]>,
  N: number
): number[] {
  const parent = new Array(N).fill(0).map((_, i) => i);

  const find = (x: number): number =>
    parent[x] === x ? x : (parent[x] = find(parent[x]));

  const union = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[rb] = ra;
  };

  for (const [a, b] of edges) union(a, b);

  const out = new Set<number>();
  for (let i = 0; i < N; i++) out.add(find(i));

  return Array.from(out);
}

/* -------------------------------------------------------------
 * 5) Persistence Diagram
 * -----------------------------------------------------------*/
export interface PersistencePair {
  birth: number;
  death: number;
  dim: 0 | 1;
}

export function persistenceDiagram(
  points: number[][],
  eps: number
): PersistencePair[] {
  const N = points.length;
  const edges = ripsEdges(points, eps);

  const comps = connectedComponents(edges, N);
  const out: PersistencePair[] = [];

  // H0 births (always 0) and approximate death = eps
  for (let i = 0; i < comps.length; i++) {
    out.push({ birth: 0, death: eps, dim: 0 });
  }

  // H1 (simple loop detection)
  if (edges.length > N + 2) {
    out.push({
      birth: eps * 0.5,
      death: eps,
      dim: 1,
    });
  }

  return out;
}

/* -------------------------------------------------------------
 * 6) Bottleneck Distance
 * -----------------------------------------------------------*/
export function bottleneckDistance(
  A: PersistencePair[],
  B: PersistencePair[]
): number {
  const len = Math.min(A.length, B.length);
  let max = 0;

  for (let i = 0; i < len; i++) {
    const aLife = safeNum(A[i].death) - safeNum(A[i].birth);
    const bLife = safeNum(B[i].death) - safeNum(B[i].birth);

    const diff = Math.abs(aLife - bLife);
    if (diff > max) max = diff;
  }

  return safeNum(max);
}

/* -------------------------------------------------------------
 * 7) Leakage Score (used by StabilityKernel)
 * -----------------------------------------------------------*/
export function topologyLeakageScore(diag: PersistencePair[]): number {
  let shortBars = 0;

  for (const p of diag) {
    const life = safeNum(p.death) - safeNum(p.birth);
    if (life < 0.1) shortBars++;
  }

  return Math.tanh(shortBars / 10);
}

/* -------------------------------------------------------------
 * 8) Persistence Loss (TDAVIB)
 * -----------------------------------------------------------*/
export function persistenceLoss(
  diagIn: PersistencePair[],
  diagOut: PersistencePair[]
): number {
  const d = bottleneckDistance(diagIn, diagOut);
  return safeNum(1 / (1 + d));
}

/* -------------------------------------------------------------
 * 9) computePersistenceFeatures — TDAVIB 전용 Feature Extractor
 * -----------------------------------------------------------*/
export function computePersistenceFeatures(vec: number[]) {
  // 1) 1D 벡터를 pseudo-point cloud로 변환
  const points = vec.map((v, i) => [i, safeNum(v)]);

  const eps = 0.5;

  // 2) persistence diagram
  const diag = persistenceDiagram(points, eps);

  // 3) Betti numbers
  let betti0 = 0;
  let betti1 = 0;
  let betti2 = 0; // 2D는 존재하지 않지만 placeholder

  for (const p of diag) {
    if (p.dim === 0) betti0++;
    if (p.dim === 1) betti1++;
  }

  // 4) persistence energy
  let energy = 0;
  for (const p of diag) {
    const life = safeNum(p.death) - safeNum(p.birth);
    energy += life * life;
  }

  return {
    betti0,
    betti1,
    betti2,
    energy,
  };
}
