// 🔒 YUA Memory Dedup Rule — PHASE 9-6 FINAL

export interface DedupRuleInput {
  similarity: number;
  confidence: number;
}

export interface DedupRuleResult {
  isDuplicate: boolean;
  reason?: string;
}

export const MemoryDedupRule = {
  evaluate(input: DedupRuleInput): DedupRuleResult {
    // 1️⃣ 거의 동일 의미
    if (input.similarity >= 0.90) {
      return {
        isDuplicate: true,
        reason: "semantic_identical",
      };
    }

    // 2️⃣ 높은 유사도 + 낮은 자신감
    if (
      input.similarity >= 0.85 &&
      input.confidence < 0.8
    ) {
      return {
        isDuplicate: true,
        reason: "high_similarity_low_confidence",
      };
    }

    return { isDuplicate: false };
  },
};
