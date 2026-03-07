// 📂 src/ai/hpe/4/hpe4-protocol.ts
// 🔥 HPE 4.0 Protocol Types (2025.11 FINAL)

import { DAGScenario, DAGNode } from "./dag-types";

export interface HPE4Result {
  ok: boolean;
  input: string;
  dag: any;          // raw DAG from predictive
  pruned: any;       // pruned DAG
  scored: DAGScenario[];
  best: DAGScenario | null;
}
