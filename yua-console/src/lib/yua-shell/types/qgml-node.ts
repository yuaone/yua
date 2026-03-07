// ===================================================================
// QGML Node Types — SSOT 10.1 FINAL (Runtime-Safe Patched Version)
// ===================================================================

export type QGMLNode =
  | EmptyNode
  | EngineCallNode
  | QuantumBlockNode
  | ParallelBlockNode
  | TimelineBlockNode
  | FutureBlockNode
  | BranchNode
  | ScenarioNode
  | AwaitNode
  | ExpressionNode
  | UnknownNode;

// --------------------------------------------------------------
// BASE NODE — PATCHED
// --------------------------------------------------------------
export interface BaseNode {
  raw?: string;     // optional 유지
  pos?: number;

  // ⭐ 런타임 안전성 확보용 getter
  getRaw?(): string;
}

// --------------------------------------------------------------
// EMPTY
// --------------------------------------------------------------
export interface EmptyNode extends BaseNode {
  type: "empty";
}

// --------------------------------------------------------------
// ENGINE CALL
// --------------------------------------------------------------
export interface EngineCallNode extends BaseNode {
  type: "engine_call";
  namespace: string;
  method: string;
  args: string[];
}

// --------------------------------------------------------------
// QUANTUM BLOCK
// --------------------------------------------------------------
export interface QuantumBlockNode extends BaseNode {
  type: "quantum_block";
  body: string[];
}

// --------------------------------------------------------------
// PARALLEL BLOCK
// --------------------------------------------------------------
export interface ParallelBlockNode extends BaseNode {
  type: "parallel_block";
  body: string[];
}

// --------------------------------------------------------------
// TIMELINE BLOCK
// --------------------------------------------------------------
export interface TimelineBlockNode extends BaseNode {
  type: "timeline_block";
  body: string[];
}

// --------------------------------------------------------------
// FUTURE BLOCK
// --------------------------------------------------------------
export interface FutureBlockNode extends BaseNode {
  type: "future_block";
  body: string[];
}

// --------------------------------------------------------------
// BRANCH BLOCK
// --------------------------------------------------------------
export interface BranchCase {
  name: string;
  body: string[];
}

export interface BranchNode extends BaseNode {
  type: "branch";
  cases: BranchCase[];
}

// --------------------------------------------------------------
// SCENARIO
// --------------------------------------------------------------
export interface ScenarioNode extends BaseNode {
  type: "scenario";
  name: string;
  body: string[];
}

// --------------------------------------------------------------
// AWAIT
// --------------------------------------------------------------
export interface AwaitNode extends BaseNode {
  type: "await";
  expr: QGMLNode;
}

// --------------------------------------------------------------
// EXPR
// --------------------------------------------------------------
export interface ExpressionNode extends BaseNode {
  type: "expr";
  value: string;
}

// --------------------------------------------------------------
// UNKNOWN
// --------------------------------------------------------------
export interface UnknownNode extends BaseNode {
  type: "unknown";
  reason?: string;
}
