// 📂 src/ai/quantum/qwave.ts
// 🔥 Base Wave Generator — FINAL ENTERPRISE PATCH (2025.12)

export function generateWave(text: string): number[] {
  if (!text) return [];

  const wave: number[] = [];
  const base = 37;

  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i) || 0;
    const val =
      Math.sin(code * 0.1) +
      Math.cos((code + base) * 0.05);

    wave.push(Number.isFinite(val) ? val : 0);
  }

  return wave;
}
