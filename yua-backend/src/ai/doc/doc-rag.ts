// 📂 src/ai/doc/doc-rag.ts
// Document RAG: embedding 생성, 블록 동기화, 벡터 검색

import crypto from "crypto";
import { pgPool as pool } from "../../db/postgres.js";
import OpenAI from "openai";

const EMBEDDING_MODEL = "text-embedding-3-small";
const EMBEDDING_DIM = 1536;
const MAX_CHUNK_CHARS = 1500;
const EMBED_BATCH_SIZE = 20;

// ── OpenAI client for embeddings ──

function getOpenAI(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");
  return new OpenAI({ apiKey });
}

// ── Embedding generation ──

export async function generateEmbedding(text: string): Promise<number[]> {
  if (!text.trim()) return [];
  const client = getOpenAI();
  const res = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text.slice(0, 8000), // safety truncate
  });
  return res.data[0]?.embedding ?? [];
}

export async function generateEmbeddingsBatch(
  texts: string[]
): Promise<number[][]> {
  if (texts.length === 0) return [];
  const client = getOpenAI();
  const res = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts.map((t) => t.slice(0, 8000)),
  });
  return res.data.map((d) => d.embedding);
}

// ── Content hash ──

function contentHash(content: string): string {
  return crypto.createHash("sha256").update(content).digest("hex").slice(0, 16);
}

// ── Block sync (editor JSON → document_blocks) ──

type BlockInput = {
  type: string;
  content: string;
  order: number;
};

function extractBlocksFromJSON(json: any): BlockInput[] {
  const blocks: BlockInput[] = [];
  if (!json?.content || !Array.isArray(json.content)) return blocks;

  let order = 0;
  for (const node of json.content) {
    const type = node.type || "paragraph";
    const text = extractText(node);
    if (!text.trim()) continue;

    if (text.length > MAX_CHUNK_CHARS) {
      // Split long blocks
      const parts = splitByBoundary(text, MAX_CHUNK_CHARS);
      for (const part of parts) {
        blocks.push({ type, content: part, order: order++ });
      }
    } else {
      blocks.push({ type, content: text, order: order++ });
    }
  }

  return blocks;
}

function extractText(node: any): string {
  if (typeof node === "string") return node;
  if (node.text) return node.text;
  if (node.content && Array.isArray(node.content)) {
    return node.content.map(extractText).join("");
  }
  return "";
}

function splitByBoundary(text: string, maxLen: number): string[] {
  const parts: string[] = [];
  let remaining = text;
  while (remaining.length > maxLen) {
    // Find sentence boundary near maxLen
    let splitAt = remaining.lastIndexOf(".", maxLen);
    if (splitAt < maxLen * 0.5) splitAt = remaining.lastIndexOf("\n", maxLen);
    if (splitAt < maxLen * 0.3) splitAt = maxLen;
    parts.push(remaining.slice(0, splitAt + 1).trim());
    remaining = remaining.slice(splitAt + 1).trim();
  }
  if (remaining) parts.push(remaining);
  return parts;
}

export async function syncDocBlocks(
  docId: string,
  contentJson: any
): Promise<{ synced: number; queued: number }> {
  const blocks = extractBlocksFromJSON(contentJson);
  if (blocks.length === 0) return { synced: 0, queued: 0 };

  // Delete old blocks for this doc
  await pool.query("DELETE FROM document_blocks WHERE doc_id = $1", [docId]);

  let queued = 0;

  for (const block of blocks) {
    const hash = contentHash(block.content);
    const id = crypto.randomUUID();

    await pool.query(
      `INSERT INTO document_blocks (id, doc_id, block_type, block_order, content, content_hash)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, docId, block.type, block.order, block.content, hash]
    );

    // Skip codeBlock embedding
    if (block.type === "codeBlock") continue;

    queued++;
  }

  // Generate embeddings for non-code blocks (async but inline for now)
  await processEmbeddingsForDoc(docId);

  return { synced: blocks.length, queued };
}

// ── Embedding processing ──

async function processEmbeddingsForDoc(docId: string): Promise<void> {
  const { rows } = await pool.query(
    `SELECT id, content, content_hash FROM document_blocks
     WHERE doc_id = $1 AND embedding IS NULL AND block_type != 'codeBlock'
     ORDER BY block_order`,
    [docId]
  );

  if (rows.length === 0) return;

  // Batch embed
  for (let i = 0; i < rows.length; i += EMBED_BATCH_SIZE) {
    const batch = rows.slice(i, i + EMBED_BATCH_SIZE);
    const texts = batch.map((r: any) => r.content);

    try {
      const embeddings = await generateEmbeddingsBatch(texts);

      for (let j = 0; j < batch.length; j++) {
        const row = batch[j];
        const vec = embeddings[j];
        if (!vec || vec.length !== EMBEDDING_DIM) continue;

        // Stale check: only apply if content_hash still matches
        const vecStr = `[${vec.join(",")}]`;
        await pool.query(
          `UPDATE document_blocks
           SET embedding = $1::vector, updated_at = now()
           WHERE id = $2 AND content_hash = $3`,
          [vecStr, row.id, row.content_hash]
        );
      }
    } catch (err) {
      console.error("[DOC_RAG] Embedding batch error:", err);
    }
  }
}

// ── Vector search ──

export type SearchResult = {
  block_id: string;
  block_type: string;
  content: string;
  content_preview: string;
  score: number;
  block_order: number;
};

export async function searchDocBlocks(
  docId: string,
  query: string,
  topK: number = 8
): Promise<SearchResult[]> {
  const queryVec = await generateEmbedding(query);
  if (queryVec.length === 0) return [];

  const vecStr = `[${queryVec.join(",")}]`;

  const { rows } = await pool.query(
    `SELECT id AS block_id, block_type, content, block_order,
            1 - (embedding <=> $1::vector) AS score
     FROM document_blocks
     WHERE doc_id = $2
       AND embedding IS NOT NULL
       AND block_type != 'codeBlock'
     ORDER BY score DESC
     LIMIT $3`,
    [vecStr, docId, topK]
  );

  return (rows as any[]).map((r) => ({
    block_id: r.block_id,
    block_type: r.block_type,
    content: r.content,
    content_preview: r.content.slice(0, 200),
    score: parseFloat(r.score),
    block_order: r.block_order,
  }));
}

// ── Score adjustment ──

export function adjustScores(results: SearchResult[]): SearchResult[] {
  return results
    .map((r) => {
      let boost = 0;
      if (r.block_type.startsWith("heading")) boost += 0.02;
      return { ...r, score: r.score + boost };
    })
    .sort((a, b) => b.score - a.score);
}
