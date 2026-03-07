// 🔥 PHASE 9-4 — EVENT EMBEDDING GENERATOR (SSOT FINAL)
// - write-only
// - deterministic
// - idempotent
// - batch-safe
// - NO retrieval / NO decision
// - M-05 FIX: Batch OpenAI API calls

import type { Client } from "pg";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const BATCH_SIZE = 50;

type NormalizedEventRow = {
  id: number;
  event_id: string;
  intent: string;
  has_text: boolean;
  has_image: boolean;
  is_multimodal: boolean;
  payload: any;
};

function buildNamespace(row: NormalizedEventRow): string {
  if (row.is_multimodal) return "event:multimodal";
  if (row.has_image) return "event:image";
  return "event:text";
}

function buildEmbeddingText(row: NormalizedEventRow): string {
  const payload = row.payload ?? {};

  const parts: string[] = [];

  parts.push(`[EVENT]`);
  parts.push(`intent: ${row.intent}`);

  if (typeof payload?.message === "string") {
    parts.push(`text: ${payload.message.slice(0, 1000)}`);
  }

  if (payload?.caption || payload?.ocr) {
    parts.push(`[IMAGE]`);
    if (payload.caption) parts.push(`caption: ${payload.caption}`);
    if (payload.ocr) parts.push(`ocr: ${payload.ocr}`);
  }

  return parts.join("\n");
}

export async function generateEventEmbeddings(
  client: Client,
  rows: NormalizedEventRow[]
): Promise<void> {
  // Filter valid rows
  const validRows = rows.filter((r) => buildEmbeddingText(r).trim());
  if (!validRows.length) return;

  // Process in batches
  for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
    const batch = validRows.slice(i, i + BATCH_SIZE);
    const texts = batch.map((r) => buildEmbeddingText(r));

    const embeddingResult = await openai.embeddings.create({
      model: "text-embedding-3-large",
      input: texts,
    });

    for (let j = 0; j < batch.length; j++) {
      const row = batch[j];
      const vector = embeddingResult.data[j].embedding;
      const namespace = buildNamespace(row);

      await client.query(
        `
        INSERT INTO phase9_event_embeddings (
          normalized_id,
          embedding,
          namespace,
          model
        )
        VALUES ($1,$2,$3,$4)
        ON CONFLICT DO NOTHING
        `,
        [row.id, vector, namespace, "text-embedding-3-large"]
      );
    }
  }
}
