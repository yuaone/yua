// 🔥 YUA Memory Embedding Backfill — One-shot script
// Generates embeddings for all active memory_records missing embeddings.
// Uses OpenAI batch API to minimize calls.
// Run: npx tsx src/ai/memory/backfill-embeddings.ts

import "dotenv/config";
import { pgPool } from "../../db/postgres";
import OpenAI from "openai";

const DIM = 1536;
const BATCH_SIZE = 50; // OpenAI batch limit per call

async function backfill() {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  // Fetch all active records without embeddings
  const { rows } = await pgPool.query<{ id: number; content: string }>(
    `SELECT id, content FROM memory_records WHERE is_active = true AND embedding IS NULL AND content IS NOT NULL AND length(content) >= 3 ORDER BY id`
  );

  console.log(`[BACKFILL] Found ${rows.length} records without embeddings`);

  if (rows.length === 0) {
    console.log("[BACKFILL] Nothing to do");
    process.exit(0);
  }

  let updated = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const texts = batch.map((r) => r.content.slice(0, 8000)); // OpenAI input limit

    try {
      const res = await client.embeddings.create({
        model: "text-embedding-3-small",
        input: texts,
      });

      for (let j = 0; j < batch.length; j++) {
        const vec = res.data[j]?.embedding ?? [];
        if (vec.length < DIM) continue;

        const vecStr = `[${vec.slice(0, DIM).join(",")}]`;

        try {
          await pgPool.query(
            `UPDATE memory_records SET embedding = $1::vector WHERE id = $2`,
            [vecStr, batch[j].id]
          );
          updated++;
        } catch (e) {
          console.error(`[BACKFILL] DB error for id=${batch[j].id}:`, e);
          failed++;
        }
      }

      console.log(`[BACKFILL] Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batch.length} processed (total: ${updated}/${rows.length})`);
    } catch (e) {
      console.error(`[BACKFILL] OpenAI batch error at offset ${i}:`, e);
      failed += batch.length;
    }
  }

  console.log(`[BACKFILL] Done: ${updated} updated, ${failed} failed out of ${rows.length}`);
  process.exit(failed > 0 ? 1 : 0);
}

backfill();
