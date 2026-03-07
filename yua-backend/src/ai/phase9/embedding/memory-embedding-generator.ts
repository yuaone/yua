// 🔥 PHASE 9-4 — MEMORY EMBEDDING GENERATOR (SSOT FINAL)
// - write-only
// - deterministic
// - idempotent
// - batch-safe
// - NO retrieval / NO judgment
// - M-05 FIX: Batch OpenAI API calls

import type { Client } from "pg";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const BATCH_SIZE = 50;

type MemoryRow = {
  id: number;
  scope: string;
  content: string;
};

function mapScopeToNamespace(scope: string): string {
  switch (scope) {
    case "project_decision":
      return "memory:decision";
    case "project_architecture":
      return "memory:architecture";
    case "rag":
      return "memory:rag";
    default:
      return "memory:general";
  }
}

function buildEmbeddingText(row: MemoryRow): string {
  return [
    `[MEMORY]`,
    `scope: ${row.scope}`,
    `content:`,
    row.content.slice(0, 2000),
  ].join("\n");
}

export async function generateMemoryEmbeddings(
  client: Client,
  rows: MemoryRow[]
): Promise<void> {
  // Filter valid rows
  const validRows = rows.filter((r) => r.content?.trim());
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
      const namespace = mapScopeToNamespace(row.scope);

      await client.query(
        `
        INSERT INTO phase9_memory_embeddings (
          memory_record_id,
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
