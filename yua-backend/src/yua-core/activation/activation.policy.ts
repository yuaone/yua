// 🔒 YUA Activation Policy — PHASE 7-A FINAL (SSOT)
// 역할: Judgment 결과를 "실제 서비스 영향도"로 변환
// ❌ 판단 생성 없음
// ❌ 엔진 선택 없음
// ✅ 출력 영향도만 결정

export type ActivationLevel =
  | "SHADOW"    // 결과 생성 ❌ / 로그만
  | "LIMITED"   // 제한된 출력 (요약/가이드)
  | "FULL";     // 전체 출력 허용

export interface ActivationInput {
  verdict: "APPROVE" | "BLOCK" | "SILENCE";
  confidence: number;
  risk: number;
  path: string;
  engine: "CORE" | "DESIGN";
}

export interface ActivationDecision {
  level: ActivationLevel;
  reason: string;
}

/**
 * Activation Policy (SSOT)
 *
 * 불변 규칙:
 * 1. BLOCK / SILENCE → FULL 절대 불가
 * 2. 낮은 confidence는 출력 축소만 가능
 * 3. risk는 확대가 아니라 축소에만 영향
 */
export function decideActivation(
  input: ActivationInput
): ActivationDecision {
  const { verdict, confidence, risk, engine } = input;

  // --------------------------------
  // 🛑 절대 차단
  // --------------------------------
  if (verdict === "BLOCK" || verdict === "SILENCE") {
    return {
      level: "SHADOW",
      reason: "judgment_block_or_silence",
    };
  }

  // --------------------------------
  // ⚠️ 고위험 → 제한 출력
  // --------------------------------
  if (risk >= 0.7) {
    return {
      level: "LIMITED",
      reason: "high_risk_output_limited",
    };
  }

  // --------------------------------
  // ⚠️ 낮은 신뢰도 → 제한 출력
  // --------------------------------
  if (confidence < 0.55) {
    return {
      level: "LIMITED",
      reason: "low_confidence_output_limited",
    };
  }

  // --------------------------------
  // 🧪 DESIGN 엔진은 항상 제한
  // --------------------------------
  if (engine === "DESIGN") {
    return {
      level: "LIMITED",
      reason: "design_engine_guardrail",
    };
  }

  // --------------------------------
  // ✅ 완전 활성화
  // --------------------------------
  return {
    level: "FULL",
    reason: "safe_full_activation",
  };
}
