// 📂 src/ai/reasoning/pkl-drift.ts
// 🔥 PKL 3.0 — Semantic Drift Score Engine (2025.11 FINAL)

export function semanticDriftScore(vector: number[]): number {
  if (!vector || !Array.isArray(vector) || vector.length === 0) {
    return 0.1; // 최소 drift
  }

  // 평균 기반 간단 Drift 측정
  const mean = vector.reduce((a, b) => a + b, 0) / vector.length;

  // 절대 평균 → Drift 크기 판단
  const drift = Math.min(Math.abs(mean) / 1.5, 1);

  // 0.1 ~ 0.95 사이 값
  return Math.max(0.1, Math.min(drift, 0.95));
}
