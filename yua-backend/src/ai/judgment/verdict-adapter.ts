// 🔒 Verdict Adapter — SSOT FINAL
// 목적:
// - DecisionResult.verdict → Persona/Judgment 공용 Verdict로 변환
// - 타입 비교 오류 완전 차단
// - Adapter 외부에서는 verdict 분기 금지

import type { DecisionResult } from "../../types/decision";

/**
 * 🔑 공용 Verdict (SSOT)
 * - Persona / Permission / Expression 에서 사용하는 단일 타입
 */
export type NormalizedVerdict =
  | "APPROVE"
  | "BLOCK"
  | "DEFER"
  | "HOLD";

/**
 * normalizeVerdict
 *
 * 규칙 (SSOT):
 * - APPROVE → APPROVE
 * - REJECT → BLOCK
 * - 그 외 예상 외 값 → BLOCK
 */
export function normalizeVerdict(
  verdict: DecisionResult["verdict"]
): NormalizedVerdict {
  switch (verdict) {
    case "APPROVE":
      return "APPROVE";

    case "REJECT":
      return "BLOCK";

    default:
      // 타입 확장 대비 안전장치
      return "BLOCK";
  }
}
