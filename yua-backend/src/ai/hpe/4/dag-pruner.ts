// 📂 src/ai/hpe/4/dag-pruner.ts
// 🔥 HPE 4.0 — DAG Pruner FINAL

import { DAGScenario } from "./dag-types";

export function pruneDAG(scenarios: DAGScenario[]): DAGScenario[] {
  return scenarios.filter((s) => {
    const last = s.path[s.path.length - 1];
    return !/irrelevant|noise|empty/gi.test(last.text);
  });
}
