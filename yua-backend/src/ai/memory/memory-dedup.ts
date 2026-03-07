// 🔥 YUA Memory Dedup Engine — PHASE 9-6 FINAL (BATCH OPTIMIZED)
// - Vector 기반 의미 중복 제거
// - LLM ❌
// - Deterministic
// - PG + Runtime 안전
// - M-05 FIX: Batch embed instead of O(n) serial calls

import { embed } from "../vector/embedder";
import { cosineSimilarity } from "./memory-vector-utils";
import { MemoryDedupRule } from "./memory-dedup.rule";
import type { MemoryCandidate } from "./memory-candidate.type";
import OpenAI from "openai";

export interface DedupResult {
  isDuplicate: boolean;
  similarity?: number;
  reason?: string;
}

const DIM = 1536;

/**
 * Batch embed multiple texts in a single OpenAI API call.
 * Falls back to serial embed() if batch fails.
 */
async function batchEmbed(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const res = await client.embeddings.create({
      model: "text-embedding-3-small",
      input: texts,
    });

    return res.data.map((d) => {
      const vec = d.embedding.slice(0, DIM);
      while (vec.length < DIM) vec.push(0);
      return vec;
    });
  } catch {
    // Fallback: serial embed
    const results: number[][] = [];
    for (const text of texts) {
      const r = await embed(text);
      results.push(r.vector);
    }
    return results;
  }
}

export async function dedupMemoryCandidate(params: {
  candidate: MemoryCandidate;
  existingContents: string[];
}): Promise<DedupResult> {
  const { candidate, existingContents } = params;

  if (existingContents.length === 0) {
    return { isDuplicate: false };
  }

  const validTexts = existingContents.filter((t) => t && t.length >= 5);
  if (validTexts.length === 0) {
    return { isDuplicate: false };
  }

  // Batch: embed candidate + all existing texts in ONE API call
  const allTexts = [candidate.content, ...validTexts];
  const allVectors = await batchEmbed(allTexts);

  const candidateVec = allVectors[0];
  let maxSimilarity = 0;

  for (let i = 1; i < allVectors.length; i++) {
    const sim = cosineSimilarity(candidateVec, allVectors[i]);
    if (sim > maxSimilarity) {
      maxSimilarity = sim;
    }
  }

  const rule = MemoryDedupRule.evaluate({
    similarity: maxSimilarity,
    confidence: candidate.confidence,
  });

  return {
    isDuplicate: rule.isDuplicate,
    similarity: maxSimilarity,
    reason: rule.reason,
  };
}
