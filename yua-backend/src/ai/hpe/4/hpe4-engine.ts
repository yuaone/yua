// 📂 src/ai/hpe/4/hpe4-engine.ts
// 🔥 HPE 4.0 — Predictive DAG Engine (FINAL 2025.11)

import { buildPredictiveDAG, toDAGScenarioList } from "./hpe4-predictive";
import { pruneDAG } from "./dag-pruner";
import { scorePaths } from "./dag-aggregator";
import { HPE4Result } from "./hpe4-protocol";

export async function runHPE4(input: string): Promise<HPE4Result> {
  // 1) DAG 생성
  const dag = buildPredictiveDAG(input);

  // 2) PredictiveResult → DAGScenario[] 로 변환 (타입 mismatch 해결)
  const scenarioList = toDAGScenarioList(dag);

  // 3) pruning 처리
  const pruned = pruneDAG(scenarioList);

  // 4) 점수 계산
  const scored = scorePaths(pruned);

  // 5) Top-1 선택
  const best = scored[0];

  return {
    ok: true,
    input,
    dag,
    pruned,
    scored,
    best
  };
}
