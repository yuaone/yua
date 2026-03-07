// 🔥 YUA Memory Decay — SSOT (Production)
// -------------------------------------
// ✔ 시간 기반 감쇠
// ✔ 재학습 ❌
// ✔ 단순 · 결정적

export function decayMemoryWeight(args: {
  createdAt: number; // timestamp
  now?: number;
}): number {
  const now = args.now ?? Date.now();
  const ageMs = now - args.createdAt;

  const DAY = 24 * 60 * 60 * 1000;

  // 0~7일: 유지
  if (ageMs < 7 * DAY) return 1.0;

  // 7~30일: 완만한 감소
  if (ageMs < 30 * DAY) return 0.7;

  // 30~90일: 강한 감소
  if (ageMs < 90 * DAY) return 0.4;

  // 90일 초과: 거의 폐기
  return 0.1;
}
