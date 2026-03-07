// 📂 src/ai/hpe/4/dag-simulator.ts
// 🔥 HPE 4.0 — DAG Simulator FINAL (2025.11)
// -------------------------------------------------------
// ✔ Root → Branch → Leaf 단계적 시나리오 생성
// ✔ Risk Scorer와 자동 연동
// ✔ 최대 12개 시나리오 생성
// -------------------------------------------------------

import { DAGNode, DAGScenario, ConsensusInput } from "./dag-types";
import { DAGScorer } from "./dag-scorer";

export const DAGSimulator = {
  simulate(consensus: ConsensusInput): DAGScenario[] {
    const base = consensus.majority || "no consensus";

    const root: DAGNode = {
      id: "root",
      text: base,
      depth: 0,
      parentId: null,
    };

    // 1차 분기 3개
    const branches = [
      "positive outlook",
      "neutral outcome",
      "negative risk",
    ].map((text, i) => ({
      id: `b${i}`,
      text: `${base} → ${text}`,
      depth: 1,
      parentId: "root",
    }));

    // 2차 분기 (각 3개 = 총 9개)
    const leaves: DAGNode[] = [];
    branches.forEach((b, i) => {
      ["impact A", "impact B", "impact C"].forEach((impact, j) => {
        leaves.push({
          id: `l${i}${j}`,
          text: `${b.text} → ${impact}`,
          depth: 2,
          parentId: b.id,
        });
      });
    });

    const scenarios: DAGScenario[] = leaves.map((leaf) => {
      const parent = branches.find((b) => b.id === leaf.parentId)!;
      const path: DAGNode[] = [root, parent, leaf];

      return DAGScorer.compute(path);
    });

    return scenarios;
  },
};
