// 🔒 PHASE 7.5 Runtime Statistics Types (SSOT)

export type RuntimeVerdict =
  | "APPROVE"
  | "HOLD"
  | "BLOCK"   // 정책 차단
  | "REJECT"; // 판단 거부 (통계 보존용)

export type EngineType = "CORE" | "DESIGN";

export interface RuntimeStatRecord {
  threadId?: number;
  traceId?: string;

  path: string;
  engine: EngineType;
  toolLevel: "NONE" | "LIMITED" | "FULL";

  confidence: number;
  risk: number;
  toolScore: number;

  // 🔥 PHASE 7.6
  verifierBudget: number;
  verifierUsed: number;
  verifierFailed: boolean;

  verdict: RuntimeVerdict;
  pathChanged: boolean;
}
