// src/ai/vector/embedder.ts
import OpenAI from "openai";

const DIM = 1536;


export interface EmbeddingResult {
  ok: boolean;
  provider: "openai" | "fallback" | "empty";
  vector: number[];
}

export type Embedder = {
  model: string;
  dim: number;
  embedTexts: (texts: string[]) => Promise<number[][]>;
};

function normalizeVector(vec: number[]): number[] {
  let sumSq = 0;
  for (const v of vec) {
    if (Number.isFinite(v)) sumSq += v * v;
  }

  const norm = Math.sqrt(sumSq);
  if (!Number.isFinite(norm) || norm === 0) return vec;

  return vec.map((v) =>
    Number.isFinite(v) ? v / norm : 0
  );
}

/**
 * 🔥 Backward-Compatible Single Embed (SSOT)
 */
export async function embed(
  text: string,
  apiKey: string | undefined = process.env.OPENAI_API_KEY
): Promise<EmbeddingResult> {
  if (!text?.trim()) {
    return {
      ok: true,
      provider: "empty",
      vector: new Array(DIM).fill(0),
    };
  }

  try {
    const client = new OpenAI({ apiKey });

    const res = await client.embeddings.create({
      model: "text-embedding-3-small",
      input: text,
    });

    const embedding = res.data?.[0]?.embedding ?? [];

    const cleaned = embedding
      .map((n: unknown) =>
        typeof n === "number" && Number.isFinite(n) ? n : 0
      )
      .slice(0, DIM);

    while (cleaned.length < DIM) cleaned.push(0);

    return {
      ok: true,
      provider: "openai",
      vector: normalizeVector(cleaned),
    };
  } catch (err) {
    console.error("❌ embed fallback:", err);

    const fallback = new Array(DIM).fill(0).map((_, i) => {
      const code = text.charCodeAt(i % text.length);
      return Math.sin(code * 0.01 + i * 0.001) * 0.01;
    });

    return {
      ok: true,
      provider: "fallback",
      vector: normalizeVector(fallback),
    };
  }
}

export function createOpenAIEmbedder(apiKey: string): Embedder {
  const client = new OpenAI({ apiKey });

  return {
    model: "text-embedding-3-small",
    dim: DIM,
    embedTexts: async (texts: string[]) => {
      const res = await client.embeddings.create({
        model: "text-embedding-3-small",
        input: texts,
      });

      return res.data.map((d) =>
        normalizeVector(
          d.embedding
            .map((n) => (Number.isFinite(n) ? n : 0))
            .slice(0, DIM)
        )
      );
    },
  };
}
