// 📂 src/ai/hpe/4/dag-types.ts
// 🔥 HPE 4.0 — DAG Types FINAL (2025.11)
// -------------------------------------------------------
// ✔ Perfect TS strict 지원
// ✔ Simulator / Scorer / Engine 전용 공통 타입
// ✔ HPE 3.0 consensus 구조와 100% 호환
// -------------------------------------------------------

export interface DAGNode {
  id: string;
  text: string;
  depth: number;           // 0 = root
  parentId?: string | null;
}

export interface DAGEdge {
  from: string;            // parent
  to: string;              // child
}

export interface DAGScenario {
  path: DAGNode[];
  score: number;           // Stability Score
  risk: number;            // Risk Score
}

export interface DAGResult {
  scenarios: DAGScenario[];
  best: DAGScenario | null;
}

export interface ConsensusInput {
  majority: string;
  raw: {
    gptMain: any;
    gemini: any;
    claude: any;
  };
}
