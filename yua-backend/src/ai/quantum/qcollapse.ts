// 📂 src/ai/quantum/qcollapse.ts
// 🔥 Collapse Kernel — FINAL 2025.12 (Strict TS Compatible)

export function bornCollapse(
  real: number[],
  imag: number[],
  temperature = 1.0,
  topK = 40
): number {
  const length = Math.min(real.length, imag.length);
  if (!length) return 0;

  const temp = temperature <= 0 ? 1 : temperature;

  const scores = new Array(length);

  for (let i = 0; i < length; i++) {
    const r = real[i] ?? 0;
    const im = imag[i] ?? 0;
    scores[i] = r * r + im * im;
  }

  const scaled = scores.map((x) => Math.pow(x || 1e-12, 1 / temp));
  const sorted = [...scaled].sort((a, b) => b - a).slice(0, topK);

  const minK = sorted[sorted.length - 1] || 1e-12;

  const filtered = scaled.map((v) => (v >= minK ? v : 1e-12));

  const sum = filtered.reduce((a, b) => a + b, 0) || 1;
  const probs = filtered.map((v) => v / sum);

  let r = Math.random();
  for (let i = 0; i < probs.length; i++) {
    r -= probs[i];
    if (r <= 0) return i;
  }
  return probs.length - 1;
}

export function collapseToText(text: string, index: number): string {
  if (!text) return "";
  if (index < 0) index = 0;
  if (index >= text.length) index = text.length - 1;
  return text[index] || "";
}
