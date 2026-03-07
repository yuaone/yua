// src/ai/judgment/judgment-metrics.ts
// 🔒 SSOT: Judgment Telemetry / Metrics (FINAL)

export interface JudgmentMetric {
  ruleId: string;
  triggerHint: string;
  hits: number;
  softFailures: number;
  hardFailures: number;
  lastHitAt?: number;
}

class JudgmentMetrics {
  private metrics = new Map<string, JudgmentMetric>();

  recordHit(ruleId: string, triggerHint: string): void {
    if (!ruleId) return;

    const metric =
      this.metrics.get(ruleId) ?? {
        ruleId,
        triggerHint,
        hits: 0,
        softFailures: 0,
        hardFailures: 0,
      };

    metric.hits += 1;
    metric.lastHitAt = Date.now();

    this.metrics.set(ruleId, metric);
  }

  recordFailure(ruleId: string, type: "soft" | "hard"): void {
    if (!ruleId) return;

    const metric = this.metrics.get(ruleId);
    if (!metric) return;

    if (type === "soft") metric.softFailures += 1;
    else metric.hardFailures += 1;
  }

  get(ruleId: string): JudgmentMetric | undefined {
    const m = this.metrics.get(ruleId);
    return m ? { ...m } : undefined;
  }

  snapshot(): JudgmentMetric[] {
    return [...this.metrics.values()].map(m => ({ ...m }));
  }

  reset(): void {
    this.metrics.clear();
  }
}

export const judgmentMetrics = new JudgmentMetrics();
