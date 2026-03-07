// 🔒 Runtime Application (NO LEARNING)

import { MetaParameter } from "./meta-parameter";

export function applyMetaThreshold(
  base: number,
  params: MetaParameter[]
): number {
  let v = base;

  for (const p of params) {
    if (p.target === "THRESHOLD") {
      v += p.delta * p.confidence;
    }
  }

  return Math.min(1, Math.max(0, v));
}
// 🔥 Stage 2: Generic weight adjuster
export function applyMetaWeight(
  base: number,
  params: MetaParameter[],
  target: MetaParameter["target"]
): number {
  let v = base;

  for (const p of params) {
    if (p.target === target) {
      v += p.delta * p.confidence;
    }
  }

  return v;
}

