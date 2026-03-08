// src/ai/memory/memory-conflict-detector.ts
// YUA Memory Conflict Detector — Negation Embedding Approach

import OpenAI from "openai";
import { cosineSimilarity } from "./memory-vector-utils.js";
import type { MemoryCandidate } from "./memory-candidate.type.js";

// ── Types ──────────────────────────────────────────────────────────

export type ConflictAction =
  | "NO_CONFLICT"
  | "SUPERSEDE"
  | "FLAG_USER"
  | "COEXIST_DOWNGRADE";

export interface ConflictResult {
  hasConflict: boolean;
  action: ConflictAction;
  conflictingMemoryId?: number;
  contradictionScore?: number;
  reason?: string;
}

export interface ExistingMemory {
  id: number;
  content: string;
  scope: string;
  confidence: number;
  source?: string;
}

// ── Constants ──────────────────────────────────────────────────────

const DIM = 1536;
const PRE_FILTER_THRESHOLD = 0.70;
const STRONG_CONTRADICTION = 0.75;
const WEAK_CONTRADICTION = 0.65;
const CONFIDENCE_GAP = 0.2;
const DOWNGRADE_FACTOR = 0.8;
const NEGATION_PREFIX = "It is NOT true that: ";

// ── Helpers ────────────────────────────────────────────────────────

function normalizeVector(vec: number[]): number[] {
  let sumSq = 0;
  for (const v of vec) {
    if (Number.isFinite(v)) sumSq += v * v;
  }
  const norm = Math.sqrt(sumSq);
  if (!Number.isFinite(norm) || norm === 0) return vec;
  return vec.map((v) => (Number.isFinite(v) ? v / norm : 0));
}

/**
 * Batch-embed all texts in a single OpenAI API call.
 * Returns null on failure (caller handles fail-safe).
 */
async function batchEmbed(texts: string[]): Promise<number[][] | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const client = new OpenAI({ apiKey });
    const res = await client.embeddings.create({
      model: "text-embedding-3-small",
      input: texts,
    });

    return res.data.map((d) => {
      const cleaned = d.embedding
        .map((n: number) => (Number.isFinite(n) ? n : 0))
        .slice(0, DIM);
      while (cleaned.length < DIM) cleaned.push(0);
      return normalizeVector(cleaned);
    });
  } catch (err) {
    console.error("[memory-conflict] batch embed failed:", err);
    return null;
  }
}

// ── No-conflict constant ───────────────────────────────────────────

const NO_CONFLICT: ConflictResult = {
  hasConflict: false,
  action: "NO_CONFLICT",
};

// ── Main ───────────────────────────────────────────────────────────

/**
 * Detect semantic conflict between a new memory candidate and existing
 * memories using negation-embedding cosine distance.
 *
 * Algorithm:
 *  1. Pre-filter: same scope + cosine_sim(new, existing) >= 0.70
 *  2. Negation embedding: contradiction_score =
 *       cosine_sim(new, neg(existing)) - cosine_sim(new, existing) + 0.5
 *  3. Resolution based on score thresholds
 */
export async function detectMemoryConflict(
  candidate: MemoryCandidate,
  existing: ExistingMemory[],
): Promise<ConflictResult> {
  // ── Step 0: scope filter (cheap, no API) ─────────────────────
  const sameScope = existing.filter((m) => m.scope === candidate.scope);
  if (sameScope.length === 0) return NO_CONFLICT;

  // ── Step 1: Pre-filter via cosine similarity ─────────────────
  // Batch-embed candidate + all same-scope existing texts
  const preTexts = [candidate.content, ...sameScope.map((m) => m.content)];
  const preVectors = await batchEmbed(preTexts);
  if (!preVectors) return NO_CONFLICT; // fail-safe

  const candidateVec = preVectors[0];
  const existingVecs = preVectors.slice(1);

  // Filter: keep only those with similarity >= threshold
  const filtered: Array<{
    mem: ExistingMemory;
    vec: number[];
    sim: number;
  }> = [];

  for (let i = 0; i < sameScope.length; i++) {
    const sim = cosineSimilarity(candidateVec, existingVecs[i]);
    if (sim >= PRE_FILTER_THRESHOLD) {
      filtered.push({ mem: sameScope[i], vec: existingVecs[i], sim });
    }
  }

  if (filtered.length === 0) return NO_CONFLICT;

  // ── Step 2: Negation embedding ───────────────────────────────
  const negatedTexts = filtered.map(
    (f) => NEGATION_PREFIX + f.mem.content,
  );
  const negVectors = await batchEmbed(negatedTexts);
  if (!negVectors) return NO_CONFLICT; // fail-safe

  // Find strongest contradiction
  let best: {
    score: number;
    mem: ExistingMemory;
  } | null = null;

  for (let i = 0; i < filtered.length; i++) {
    const { mem, sim: existingSim } = filtered[i];
    const negSim = cosineSimilarity(candidateVec, negVectors[i]);
    const contradictionScore = negSim - existingSim + 0.5;

    if (!best || contradictionScore > best.score) {
      best = { score: contradictionScore, mem };
    }
  }

  if (!best) return NO_CONFLICT;

  const { score, mem } = best;

  // ── Step 3: Resolution ───────────────────────────────────────
  if (score > STRONG_CONTRADICTION) {
    // Strong contradiction
    const trustedSource =
      candidate.source === "explicit" ||
      candidate.source === "tool_verified";

    if (trustedSource) {
      return {
        hasConflict: true,
        action: "SUPERSEDE",
        conflictingMemoryId: mem.id,
        contradictionScore: score,
        reason: `strong_contradiction (score=${score.toFixed(3)}), new source="${candidate.source}" is trusted → SUPERSEDE`,
      };
    }

    if (candidate.confidence > mem.confidence + CONFIDENCE_GAP) {
      return {
        hasConflict: true,
        action: "SUPERSEDE",
        conflictingMemoryId: mem.id,
        contradictionScore: score,
        reason: `strong_contradiction (score=${score.toFixed(3)}), new confidence ${candidate.confidence} > old ${mem.confidence} + ${CONFIDENCE_GAP} → SUPERSEDE`,
      };
    }

    return {
      hasConflict: true,
      action: "FLAG_USER",
      conflictingMemoryId: mem.id,
      contradictionScore: score,
      reason: `strong_contradiction (score=${score.toFixed(3)}), cannot auto-resolve → FLAG_USER`,
    };
  }

  if (score > WEAK_CONTRADICTION) {
    // Weak contradiction — coexist with downgrade
    return {
      hasConflict: true,
      action: "COEXIST_DOWNGRADE",
      conflictingMemoryId: mem.id,
      contradictionScore: score,
      reason: `weak_contradiction (score=${score.toFixed(3)}), both kept, weaker confidence × ${DOWNGRADE_FACTOR}`,
    };
  }

  // score <= WEAK_CONTRADICTION
  return NO_CONFLICT;
}
