// 📂 src/ai/yua/yua-types.ts
// -------------------------------------------------------
// YUA-AI v2.5 – Global Shared Types (FULL COMPATIBILITY)
// -------------------------------------------------------

// -------------------------------------------------------
// ENGINE ENUM
// -------------------------------------------------------
export type EngineName =
  | "memory"
  | "gen59"
  | "omega"
  | "tdavib"
  | "quantum"
  | "router"
  | "hpe"
  | "csk"
  | "bandit"
  | "sfe"
  | "esie"
  | "mgl"
  | "sde"
  | "dve"
  | "security"
  | "cps";

// -------------------------------------------------------
// USER INPUT
// -------------------------------------------------------
export interface YuaInput {
  id?: string;
  userId?: string;
  query: string;
  context?: any;
  timestamp?: number;
}

// -------------------------------------------------------
// STANDARD ENGINE OUTPUT
// -------------------------------------------------------
export interface YuaOutput {
  engine: EngineName;
  text: string;
  confidence: number;
  metadata?: Record<string, any>;
}

// -------------------------------------------------------
// 🔥 TIME-SERIES EXTENSION (NON-BREAKING, OPTIONAL)
// -------------------------------------------------------
export interface TimeSeriesMetrics {
  /** |x_t - x_(t-1)| */
  deltaNorm?: number;

  /** 1st derivative (speed of change) */
  velocity?: number;

  /** 2nd derivative (acceleration / curvature) */
  acceleration?: number;

  /** stability of detected trend (0~1) */
  trendConfidence?: number;
}

// -------------------------------------------------------
// 🔥 FULL STABILITY METRICS (ALL ENGINE-COMPATIBLE)
// -------------------------------------------------------
export interface StabilityMetrics {
  // kernel v2.1
  fisherTrace: number;
  crlb: number;
  jacobian: number;
  leakage: number;
  lambda: number;
  mu: number;

  // legacy compatibility fields
  crlbLowerBound?: number;
  jacobianNorm?: number;
  stabilityScore?: number;
  smoothScore?: number;
  tdaSignature?: number[];

  // 🔥 NEW — time-series awareness (optional)
  timeSeries?: TimeSeriesMetrics;

  // timestamp
  timestamp: number;
}

// -------------------------------------------------------
// ENGINE CONTEXT
// -------------------------------------------------------
export interface YuaEngineContext {
  input: YuaInput;
  history?: YuaOutput[];
  stability?: StabilityMetrics;
  causal?: CausalSignature;
  security?: SecurityContext;
}

// -------------------------------------------------------
// MEMORY ENGINE
// -------------------------------------------------------
export interface MemoryResult {
  embeddings: number[];
  recalledText?: string;
  relevanceScore: number;
}

// -------------------------------------------------------
// 🔥 MEMORY META — TIME-SERIES AWARE (OPTIONAL)
// -------------------------------------------------------
export interface MemoryTimeSeriesMeta {
  /** sequential index in time */
  index?: number;

  /** |Δx| for this memory entry */
  deltaNorm?: number;

  /** identifier for same trend segment */
  trendId?: string;

  /** coarse phase classification */
  statePhase?: "STABLE" | "SHIFT" | "RISK";
}

// -------------------------------------------------------
// GEN59-Lite RESULT
// -------------------------------------------------------
export interface Gen59Result {
  draft: string;
  refined: string;
  confidence: number;
  regularizationLambda: number;
}

// -------------------------------------------------------
// OMEGA-LITE ARBITRATION
// -------------------------------------------------------
export interface ArbitrationState {
  jsDivergence: number;
  conflictK: number;
  stabilityScore: number;
  engineConfidences: Record<EngineName, number>;
}

// -------------------------------------------------------
// CONTEXTUAL BANDIT (FULL FIELDS)
// -------------------------------------------------------
export interface BanditState {
  jsDivergence: number;
  dsConflict: number;
  stabilityMu: number;
  jacobian: number;
  fisherTrace: number;
  gen59Confidence: number;

  mathVerified?: boolean | null;
  mathType?: "ARITHMETIC" | "EQUATION" | "NUMERIC" | "CALCULUS" | "UNKNOWN";

  // legacy
  stabilityScore?: number;
  entropy?: number;
}

export interface BanditAction {
  weights: Record<string, number>;
}

// -------------------------------------------------------
// ROUTER TARGET
// -------------------------------------------------------
export type RoutingTarget = "stock" | "sports" | "general";

export interface RoutingDecision {
  target: RoutingTarget;
  confidence: number;
}

// -------------------------------------------------------
// ENGINE IO SIGNATURE (ETS)
// -------------------------------------------------------
export interface EngineIOSignature {
  input: string[];
  output: string[];
}

// -------------------------------------------------------
// CSK — Causal Stability Kernel
// -------------------------------------------------------
export interface CausalSignature {
  causalScore: number;
  conflictProbability: number;
  causalChain?: string[];
  timestamp: number;
}

// -------------------------------------------------------
// 🔁 STATE TRANSITION (FORECAST-READY)
// -------------------------------------------------------
export interface StateTransition {
  fromState: string;
  toState: string;
  probability: number;
  basedOn: "memory" | "stability" | "bandit" | "external";
  timestamp: number;
}

// -------------------------------------------------------
// SUV — State Unification Vector
// -------------------------------------------------------
export interface StateUnificationVector {
  unifiedState: number[];
  consensusScore: number;
  sourceEngines: EngineName[];
}

// -------------------------------------------------------
// CPS — Consensus & Proof Synthesizer
// -------------------------------------------------------
export interface CausalProof {
  valid: boolean;
  explanation: string;
  causalPath: string[];
  suv?: StateUnificationVector;
}

export interface ConsensusResult {
  finalText: string;
  confidence: number;
  proof: CausalProof;
}

// -------------------------------------------------------
// SECURITY — Zero-Trust
// -------------------------------------------------------
export interface SecurityContext {
  accessToken: string;
  tenantId?: string;
  timestamp: number;
}

export interface DataSignature {
  hash: string;
  engine: EngineName;
  timestamp: number;
}

// -------------------------------------------------------
// DVE — Data Validation Engine
// -------------------------------------------------------
export interface ValidationResult {
  valid: boolean;
  anomalies?: string[];
  normalized?: any;
}

// -------------------------------------------------------
// SDE — Self-Diagnostic Engine
// -------------------------------------------------------
export interface DiagnosticReport {
  engine: EngineName;
  latency: number;
  memory: number;
  violationCount: number;
  timestamp: number;
}
