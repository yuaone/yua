// 📂 src/utils/math/embedding.ts
import OpenAI from "openai";
import { logWarn, logError } from "../logger";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function embedVector(text: string): Promise<number[]> {
  try {
    const cleaned = (text ?? "").trim();
    const input = cleaned.length > 0 ? cleaned : "empty";

    const res = await client.embeddings.create({
      model: "text-embedding-3-small",
      input,
    });

    const vector = res.data?.[0]?.embedding;

    if (!vector || !Array.isArray(vector)) {
      // ✅ LoggingPayload에 존재하는 field로 변경
      logWarn("Embedding returned invalid vector", {
        error: String(input),
      });
      return new Array(1536).fill(0);
    }

    return vector;

  } catch (err: any) {
    logError("Embedding failed", err?.message || String(err));
    return new Array(1536).fill(0);
  }
}
