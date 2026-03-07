// 📂 src/ai/quantum/qwave-v2.ts
// 🔥 Wave Function Generator v2 — ENTERPRISE PATCH (2025.12)
// ✔ TS Strict 100%
// ✔ embed() 결과 검증
// ✔ NaN 제거 + normalize

import { embed } from "../vector/embedder";

export interface ComplexWave {
  real: number[];
  imag: number[];
}

export async function generateWaveV2(text: string): Promise<ComplexWave> {
  if (!text?.trim()) return { real: [], imag: [] };

  const embRes = await embed(text);

  // vector 안전 추출 (숫자 아닌 값은 모두 0 처리)
  const emb: number[] = Array.isArray(embRes?.vector)
    ? embRes.vector.map((n) => (typeof n === "number" && Number.isFinite(n) ? n : 0))
    : [];

  const D = emb.length;
  if (D === 0) return { real: [], imag: [] };

  // 1) L2 normalize
  const norm = Math.sqrt(emb.reduce((a, b) => a + b * b, 0)) || 1;
  const vnorm = emb.map((x) => x / norm);

  // 2) Phase + amplitude from normalized embedding
  const phase = vnorm.map((x) => Math.PI * Math.tanh(x));
  const amp = vnorm.map((x) => Math.log(1 + Math.abs(x)));

  const real: number[] = new Array(D);
  const imag: number[] = new Array(D);

  for (let i = 0; i < D; i++) {
    real[i] = amp[i] * Math.cos(phase[i]);
    imag[i] = amp[i] * Math.sin(phase[i]);
  }

  return { real, imag };
}
