// 🔒 YUA SSOT — Judgment IO Types (STEP 2)

import { DecisionVerdict } from "./decision";

/**
 * Rule 입력
 */
export interface RuleInput {
  content: string;
  pathType: "FAST" | "NORMAL" | "DEEP" | "RESEARCH";
}

/**
 * Rule 출력
 */
export interface RuleOutput {
  verdict: DecisionVerdict;
}

/**
 * ML 입력
 * (Rule APPROVE 이후에만 사용됨)
 */
export interface MLInput {
  features: number[];
}

/**
 * ML 출력
 * ML은 verdict를 직접 생성하지 않는다
 */
export interface MLOutput {
  confidence: number;
}
