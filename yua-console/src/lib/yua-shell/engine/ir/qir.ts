// ===================================================================
// QGML IR — SSOT v10.0 (Final)
// Parser(AST) → QIRInstruction[] → Dispatcher → Fusion Layer
// ===================================================================

export type QIRInstruction =
  | QIREngineCall
  | QIRQuantumBlock
  | QIRParallelBlock
  | QIRTimelineBlock
  | QIRFutureBlock
  | QIRScenarioBlock
  | QIRBranchBlock
  | QIRAwaitInstr
  | QIRExpr;

export interface QIREngineCall {
  type: "engine_call";
  namespace: string;
  method: string;
  args: string[];
  raw: string;
}

export interface QIRQuantumBlock {
  type: "quantum_block";
  raw: string;
  body: string[];
}

export interface QIRParallelBlock {
  type: "parallel_block";
  raw: string;
  body: string[];
}

export interface QIRTimelineBlock {
  type: "timeline_block";
  raw: string;
  body: string[];
}

export interface QIRFutureBlock {
  type: "future_block";
  raw: string;
  body: string[];
}

export interface QIRScenarioBlock {
  type: "scenario";
  name: string;
  raw: string;
  body: string[];
}

export interface QIRBranchBlock {
  type: "branch";
  raw: string;
  cases: { name: string; body: string[] }[];
}

export interface QIRAwaitInstr {
  type: "await";
  raw: string;
  expr: any; // Already QIR lowered node
}

export interface QIRExpr {
  type: "expr";
  raw: string;
  value: string;
}
