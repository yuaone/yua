// 📂 src/ai/hpe/hpe7/hpe7-protocol.ts
// ------------------------------------------------------
// HPE 7.0 — Protocol & Type Contracts (FINAL CLEAN VERSION)
// ------------------------------------------------------

// 🔥 1) 핵심 인과 이벤트 (CausalEvent)
export interface CausalEvent {
  id: string;
  input: string;
  output: string;
  timestamp: number;
  tags: string[];
}

// 🔥 2) 인과 연결 구조 (CausalLink)
export interface CausalLink {
  from: string;
  to: string;
  weight: number;
}

// 🔥 3) 인과 그래프 전체 구조
export interface CausalGraph {
  nodes: CausalEvent[];
  links: CausalLink[];
}

// 🔥 4) HPE 7.0 Input 정의
export interface HPE7Input {
  text: string;
  sessionId?: string;
}

// 🔥 5) HPE7 Output
export interface HPE7Output {
  ok: boolean;
  saved: boolean;
  event: CausalEvent;
  graph: CausalGraph;
  memory?: {
    recent: any;
    patterns: any;
  };
}

// 🔥 6) Quantile 기반 분포형 Score
export interface QuantileDistribution {
  quantiles: number[];
}

// 🔥 7) DRL Path Scenario (Policy, State, Regularizer가 요구하는 전체 필드 포함)
export interface PathScenario {
  pathId: string;

  // Raw score (context ⊙ embedding)
  rawScore: number;

  // Scenario embedding vector
  embedding: number[];

  // DRL weight (현재 시점의 weight)
  weight: number;

  // weight 변화 추적용
  currentWeights: number[];

  // Distribution (Z_j(t), Z_j(t-1))
  scoreDistribution: number[];
  prevScoreDistribution: number[];
}

// 🔥 8) HPE 7.0 엔진 상태 (EngineState)
export interface EngineState {
  contextEMA: number[];
  topKPaths: PathScenario[];
  systemMetrics: Record<string, number>;
}

// 🔥 9) Hyperparameters
export interface HPE7HyperParams {
  eta: number;
  betaDrift: number;
  betaInterf: number;
  targetScoreQuantile: number;
  lambdaMax: number;
  lambdaDecayK: number;
  lambdaTau: number;
}
