// 🔒 Vector Utils — SSOT FINAL (PHASE 9-6)

export function cosineSimilarity(
  a: number[],
  b: number[]
): number {
  if (a.length !== b.length) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];

    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;

    dot += x * y;
    normA += x * x;
    normB += y * y;
  }

  if (normA === 0 || normB === 0) return 0;

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
