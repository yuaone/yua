// 📂 src/ai/hpe/4/dag-aggregator.ts
// 🔥 HPE 4.0 — Path Scoring & Ranking FINAL

import { DAGScenario } from "./dag-types";

export function scorePaths(scenarios: DAGScenario[]): DAGScenario[] {
  return scenarios
    .map((s) => ({
      ...s,
      score: Number((s.score * 0.7 + (1 - s.risk) * 0.3).toFixed(4)),
    }))
    .sort((a, b) => b.score - a.score);
}
