// 🔒 YUA Memory Rule Guard — PHASE 12 SSOT
// - Rule > Stats > ML > LLM
// - async only
// - workspace scoped

import { getMemoryRules } from "./memory-rule-context";

/* --------------------------------------------------
   Auto Commit Rule
-------------------------------------------------- */
export async function canAutoCommit(
  workspaceId: string,
  args: {
    confidence: number;
    contentLength: number;
  }
): Promise<boolean> {
  const rules = await getMemoryRules(workspaceId);

  return (
    args.confidence >= rules.auto_commit.min_confidence &&
    args.contentLength >= rules.auto_commit.min_length
  );
}

/* --------------------------------------------------
   Drift Classification
-------------------------------------------------- */
export async function classifyDrift(
  workspaceId: string,
  score: number
): Promise<"NONE" | "LOW" | "MEDIUM" | "HIGH"> {
  const { drift } = await getMemoryRules(workspaceId);

  if (score >= drift.high) return "HIGH";
  if (score >= drift.medium) return "MEDIUM";
  if (score >= drift.low) return "LOW";
  return "NONE";
}

/* --------------------------------------------------
   Merge Rule
-------------------------------------------------- */
export async function canMerge(
  workspaceId: string,
  similarity: number
): Promise<boolean> {
  const { merge } = await getMemoryRules(workspaceId);
  return similarity >= merge.similarity_threshold;
}
