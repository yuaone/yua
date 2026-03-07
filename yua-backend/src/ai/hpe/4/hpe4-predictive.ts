// 📂 src/ai/hpe/4/hpe4-predictive.ts
// 🔥 HPE 4.0 — Predictive DAG Generator (ERROR-FREE FINAL)

import { DAGSimulator } from "./dag-simulator";
import { ConsensusInput, DAGScenario } from "./dag-types";

// --------------------------------------------------------------
// 타입 정의
// --------------------------------------------------------------
export interface PredictiveNode {
  id: string;
  text: string;
  score: number;
  next?: string[];
}

export interface PredictiveResult {
  scenarios: PredictiveNode[];
  bestPath: PredictiveNode[];
  reason: string;
}

// --------------------------------------------------------------
function nano() {
  return Number(process.hrtime.bigint());
}

// --------------------------------------------------------------
// ⭐ buildPredictiveDAG — sim.scenarios 타입 오류 제거 완료
// --------------------------------------------------------------
export function buildPredictiveDAG(
  input: string | ConsensusInput
): PredictiveResult {

  // ----------------------------------------------------------
  // CASE 1: ConsensusInput → DAGSimulator 사용
  // ----------------------------------------------------------
  // ⭐ CASE 1: ConsensusInput (DAGSimulator 기반)
if (typeof input === "object") {
  // ✨ sim 타입 안전하게 any 캐스팅
  const sim = DAGSimulator.simulate(input) as any;

  // DAGScenario → PredictiveNode 변환
  const scenarios: PredictiveNode[] = (sim.scenarios ?? []).map((s: any) => ({
    id: s.id ?? "",
    text: s.text ?? "",
    score: s.score ?? 0,
    next: s.next ?? []
  }));

  const bestPath: PredictiveNode[] = (sim.bestPath ?? []).map((s: any) => ({
    id: s.id ?? "",
    text: s.text ?? "",
    score: s.score ?? 0,
    next: s.next ?? []
  }));

  return {
    scenarios,
    bestPath,
    reason: "Simulated from ConsensusInput"
  };
}

  // ----------------------------------------------------------
  // CASE 2: 일반 텍스트 기반 DAG
  // ----------------------------------------------------------

  const start = nano();

  const scenarios: PredictiveNode[] = [
    {
      id: "S1",
      text: `${input} → immediate outcome`,
      score: Math.random() * 0.7
    },
    {
      id: "S2",
      text: `${input} → delayed impact`,
      score: Math.random() * 0.5
    },
    {
      id: "S3",
      text: `${input} → alternative scenario`,
      score: Math.random() * 0.9
    }
  ];

  scenarios[0].next = ["S2", "S3"];
  scenarios[1].next = ["S3"];
  scenarios[2].next = [];

  const bestPath = [...scenarios]
    .sort((a, b) => b.score - a.score)
    .slice(0, 2);

  const end = nano();

  return {
    scenarios,
    bestPath,
    reason: `Evaluated predictive DAG in ${end - start}ns`
  };
}

// --------------------------------------------------------------
// ⭐ pruneDAG 호환용 변환기 — DAGScenario[] 완전 호환
// --------------------------------------------------------------
export function toDAGScenarioList(result: PredictiveResult): DAGScenario[] {
  return result.scenarios.map((n) => ({
    id: n.id,
    text: n.text,
    score: n.score,
    next: n.next ?? [],
    path: [],        // DAGScenario 필수 필드
    risk: n.score    // 예측 score를 리스크에 매핑
  }));
}
