// 🔒 PHASE 9 Runtime Signal Resolver (WINDOW BASED)

import { RuntimeWindowAggregator } from "./runtime-window-aggregator";

export type RuntimeWindowSignal = {
  path: string;
  verdictHoldRate: number;
  avgConfidence: number;
  avgRisk: number;
  sampleSize: number;
  windowHours: number;
};

export class RuntimeWindowSignalResolver {
  static async resolveAll(lastHours = 24): Promise<RuntimeWindowSignal[]> {
    const rows = await RuntimeWindowAggregator.summary(lastHours);

    return rows.map((r: any) => ({
      path: r.path,
      verdictHoldRate:
        Number(r.hold_count) / Math.max(Number(r.total), 1),
      avgConfidence: Number(r.avg_confidence),
      avgRisk: Number(r.avg_risk),
      sampleSize: Number(r.total),
      windowHours: lastHours,
    }));
  }
}
