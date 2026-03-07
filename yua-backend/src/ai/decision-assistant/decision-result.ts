// 🔒 YUA AI Decision Assistant — Decision Result SSOT (UPGRADED, STRICT)

export type DecisionVerdict = "APPROVE" | "REJECT" | "HOLD";
export type DecisionRiskLevel = "LOW" | "MEDIUM" | "HIGH";

export interface DecisionResult {
  verdict: DecisionVerdict;

  /** 0.0 ~ 1.0 */
  confidence: number;

  riskLevel: DecisionRiskLevel;

  /** 사용자에게 노출 가능한 근거(사고흐름 ❌) */
  reasons: string[];

  /** 다음 액션(있으면 UI가 버튼/가이드로 활용) */
  requiredActions: string[];

  timestamp: number;

  decidedBy: "RULE" | "ML" | "MIXED";
}
