// 📂 src/ai/hpe/4.0/dag-scorer.ts
// 🔥 HPE 4.0 — DAG Scorer FINAL (2025.11)
// -------------------------------------------------------
// ✔ Stability Score / Risk Score 계산
// ✔ 단순 수치가 아니라 문자열 의미 기반 스코어링
// ✔ 추후 5.0 Memory Engine 연동 대비 구조
// -------------------------------------------------------

import { DAGNode, DAGScenario } from "./dag-types";

export const DAGScorer = {
  compute(nodePath: DAGNode[]): DAGScenario {
    const text = nodePath.map((n) => n.text).join(" ");

    // 안정성 점수 (Stability Score)
    const stability = 1 - this.semanticVariance(text);

    // 위험 점수 (Risk Score)
    const risk = this.estimateRisk(text);

    return {
      path: nodePath,
      score: stability,
      risk,
    };
  },

  // 문맥 다양성으로 안정성 추정
  semanticVariance(text: string): number {
    if (!text) return 0;

    const words = text.split(/\s+/);
    const unique = new Set(words.map((w) => w.toLowerCase()));

    const ratio = unique.size / words.length;
    return Math.min(1, Math.max(0, ratio - 0.1));
  },

  // 위험 예측
  estimateRisk(text: string): number {
    const danger = /(위험|하락|위기|negative|problem|fail|risk|down|crash|error)/gi;

    const matches = text.match(danger);
    if (!matches) return 0.1;

    return Math.min(1, 0.1 + matches.length * 0.12);
  },
};
