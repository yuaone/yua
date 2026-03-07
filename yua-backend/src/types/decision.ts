// 🔒 YUA SSOT — Decision Types (STEP 2 FINAL)

export type DecisionVerdict = "APPROVE" | "HOLD" | "REJECT";

export interface DecisionResult {
  verdict: DecisionVerdict;

  /**
   * Rule 또는 Rule+ML일 때만 존재
   */
  confidence?: number;

  /**
   * 판단 주체
   */
  source: "RULE" | "RULE+ML";
allowFreeExplain?: boolean;
  /**
   * 모든 판단은 되돌릴 수 있어야 한다
   */
  reversible: true;
}
