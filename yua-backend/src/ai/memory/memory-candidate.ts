// 📂 src/ai/memory/memory-candidate.ts
// 🔥 YUA Passive Memory Candidate Engine — PHASE 9-3 FINAL

import { MemoryCandidateRule } from "./memory-candidate-rule";
import { scoreMemoryCandidate } from "./memory-candidate-score";
import type { MemoryCandidate } from "./memory-candidate.type";
import type { ExecutionPlan } from "../execution/execution-plan";
import type { ExecutionResult } from "../execution/execution-result";

export interface GenerateMemoryCandidateInput {
  userMessage: string;

  executionPlan: ExecutionPlan;
  executionResult: ExecutionResult;

  reasoningConfidence?: number;
}

export function generateMemoryCandidate(
  input: GenerateMemoryCandidateInput
): MemoryCandidate | null {
  if (!input.executionResult.ok) return null;
  if (!input.executionPlan) return null;

const content = JSON.stringify(
  input.executionResult.output,
  null,
  2
);

const rule = MemoryCandidateRule.evaluate({
  userMessage: input.userMessage,
  assistantMessage: content,
});

  if (!rule.ok) return null;

  const confidence = scoreMemoryCandidate({
  baseConfidence: input.reasoningConfidence,
  ruleReason: rule.reason,
});

  return {
  content,
  scope: "general_knowledge",
  confidence,
  reason: rule.reason ?? "unknown",
  source: "passive",
};
}
