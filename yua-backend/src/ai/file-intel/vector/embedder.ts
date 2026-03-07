export type Embedder = {
  model: string;
  dim: number;
  embedTexts: (texts: string[]) => Promise<number[][]>;
};

export function assertEmbeddingDim(vec: number[], dim: number) {
  if (vec.length !== dim) throw new Error(`Embedding dim mismatch: expected ${dim}, got ${vec.length}`);
}

export function toPgvectorLiteral(vec: number[]): string {
  return `[${vec.map((n) => (Number.isFinite(n) ? n.toString() : "0")).join(",")}]`;
}
