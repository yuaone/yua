// 📂 src/ai/quantum/qnoise.ts
// 🔥 Noise Reduction — FINAL ENTERPRISE PATCH (2025.12)

export function reduceNoise(wave: number[], drift = 0): number[] {
  if (!wave || wave.length === 0) return [];

  const result: number[] = [];
  const factor = Math.max(0.05, 1 - drift * 0.2); // 최소 0.05로 안전성 증가

  for (let i = 0; i < wave.length; i++) {
    const prev = wave[i - 1] ?? wave[i];
    const next = wave[i + 1] ?? wave[i];
    const smooth = (prev + wave[i] + next) / 3;

    const val = smooth * factor;
    result.push(Number.isFinite(val) ? val : 0);
  }

  return result;
}
