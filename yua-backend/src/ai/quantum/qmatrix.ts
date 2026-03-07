// 📂 src/ai/quantum/qmatrix.ts
// 🔥 Collapse Matrix v3 — FINAL ENTERPRISE PATCH (2025.12)

export function collapseMatrix(wave: number[]): number {
  if (!wave || wave.length === 0) return 0;

  const N = wave.length;

  // 1) Normalize
  const norm = Math.sqrt(wave.reduce((a, b) => a + b * b, 0)) || 1;
  const v = wave.map((x) => x / norm);

  // 2) Damping
  const damped = v.map((x) => x * 0.92);

  // 3) Local variance
  const variance: number[] = new Array(N).fill(0);

  for (let i = 1; i < N - 1; i++) {
    const a = damped[i - 1];
    const b = damped[i];
    const c = damped[i + 1];
    variance[i] = Math.abs(a - 2 * b + c);
  }

  // 4) Composite Scoring
  let best = 0;
  let bestScore = -Infinity;

  for (let i = 0; i < N; i++) {
    const amp = Math.abs(damped[i]) || 0;
    const osc = Math.sin(i * 0.12) * 0.6 + 1.0;
    const varW = (variance[i] || 0) * 0.75 + 1;

    const score = amp * osc * varW;

    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  }

  return best;
}
