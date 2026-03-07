// 🔧 YUA Memory Decay Utils — PHASE 9-7
// - deterministic
// - math / stat only

/**
 * 시간 경과 기반 감쇠율
 * @param daysElapsed 경과 일수
 */
export function timeDecayFactor(daysElapsed: number): number {
  if (daysElapsed <= 0) return 1;

  // 🔒 완만한 지수 감쇠 (30일 반감기)
  const lambda = Math.log(2) / 30;
  const factor = Math.exp(-lambda * daysElapsed);

  return Math.max(0, Math.min(1, factor));
}

/**
 * 사용 빈도 기반 강화 계수
 * @param usageCount 최근 참조 횟수
 */
export function usageBoostFactor(usageCount: number): number {
  if (usageCount <= 0) return 1;

  // log scale (폭주 방지)
  const boost = 1 + Math.log1p(usageCount) * 0.08;
  return Math.min(1.25, boost);
}

/**
 * 최종 confidence clamp
 */
export function clampConfidence(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}
