import { JudgmentRule } from "../judgment-rule";
import { TPUStrategyScore } from "./tpu-score-result";

/**
 * 🔥 TPU Confidence Updater v3 (Reward-Centric)
 *
 * SSOT:
 * - 실패는 처벌하지 않는다
 * - 성공만 confidence를 누적 강화
 * - decay는 "시간" 기준
 */
export function updateRuleConfidenceWithTPU(
  rule: JudgmentRule,
  scores: TPUStrategyScore[],
  options?: {
    rewardScale?: number;      // 보상 증폭 계수
    maxConfidence?: number;    // 상한
    minConfidence?: number;    // 하한
    timeDecay?: number;        // 시간 기반 자연 감쇠
  }
): JudgmentRule {
  const {
    rewardScale = 0.12,   // 🔒 보수적 기본값
    maxConfidence = 0.95,
    minConfidence = 0.05,
    timeDecay = 0.995,    // 🔒 실패와 무관
  } = options ?? {};

  // 1️⃣ 시간 기반 자연 감쇠 (실패 아님)
  let confidence =
    rule.confidence * timeDecay;

  // 2️⃣ TPU 전략 매칭
  const matched = scores.find(s =>
    rule.triggerHint
      .toLowerCase()
      .includes(s.strategy.toLowerCase())
  );

  // ❌ 매칭 실패 → 아무 일도 안 함
  if (!matched) {
    return {
      ...rule,
      confidence: clamp(
        confidence,
        minConfidence,
        maxConfidence
      ),
    };
  }

  // 3️⃣ 성공 보상 계산 (누적 가능)
  const reward =
    clamp(matched.score, 0, 1) *
    rewardScale;

  confidence = clamp(
    confidence + reward,
    minConfidence,
    maxConfidence
  );

  return {
    ...rule,
    confidence,
  };
}

/* -------------------------------------------------- */
/* 🔒 Internal Utility                                */
/* -------------------------------------------------- */
function clamp(
  value: number,
  min: number,
  max: number
): number {
  return Math.max(min, Math.min(max, value));
}
