import type { MemoryDiffItem } from "./memory-snapshot-diff";

export type EvolutionSignal =
  | "CONFIDENCE_COLLAPSE"
  | "OVER_DECAY"
  | "STABLE"
  | "OVER_PRESERVE";

export interface EvolutionReport {
  signal: EvolutionSignal;
  scope: string;
  count: number;
  avgDelta: number;
}

export function analyzeMemoryEvolution(
  diffs: MemoryDiffItem[]
): EvolutionReport[] {
  const grouped = new Map<string, MemoryDiffItem[]>();

  for (const d of diffs) {
    if (!grouped.has(d.scope)) grouped.set(d.scope, []);
    grouped.get(d.scope)!.push(d);
  }

  const reports: EvolutionReport[] = [];

  for (const [scope, items] of grouped.entries()) {
    const deltas = items.map((i) => i.delta);
    const avg = deltas.reduce((a, b) => a + b, 0) / deltas.length;

    let signal: EvolutionSignal = "STABLE";

    if (avg < -0.15) signal = "CONFIDENCE_COLLAPSE";
    else if (avg < -0.05) signal = "OVER_DECAY";
    else if (avg > 0.08) signal = "OVER_PRESERVE";

    reports.push({
      scope,
      signal,
      count: items.length,
      avgDelta: Number(avg.toFixed(4)),
    });
  }

  return reports;
}
