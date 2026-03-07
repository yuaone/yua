// 📂 src/ai/memory/memory-candidate-score.ts
// 🔥 YUA Memory Candidate Scoring — PHASE 9-3

export interface MemoryCandidateScoreInput {
  baseConfidence?: number; // reasoning.confidence
  ruleReason?: string;
}

export function scoreMemoryCandidate(
  input: MemoryCandidateScoreInput
): number {
  let score = input.baseConfidence ?? 0.5;

  // Rule 기반 가중치
  switch (input.ruleReason) {
    case "declarative_statement":
      score += 0.2;
      break;
    case "structural_explanation":
      score += 0.15;
      break;
  }

  // Clamp
  return Math.max(0, Math.min(1, Number(score.toFixed(3))));
}
