// 📂 src/ai/memory/memory-conflict-detector.ts
// 🔒 YUA Memory Conflict Detector — PHASE 9-5 FINAL

import type { MemoryCandidate } from "./memory-candidate.type";

export interface ConflictResult {
  hasConflict: boolean;
  action?: "downgrade" | "reject";
  reason?: string;
}

/**
 * Conflict 정의:
 * - 같은 scope
 * - 의미는 유사한데 내용이 반대
 */
export function detectMemoryConflict(
  candidate: MemoryCandidate,
  existing: Array<{ content: string; scope: string }>
): ConflictResult {
  for (const mem of existing) {
    if (mem.scope !== candidate.scope) continue;

    // 🔹 매우 단순한 1차 충돌 휴리스틱
    if (
      mem.content.includes("아니다") &&
      candidate.content.includes("이다")
    ) {
      return {
        hasConflict: true,
        action: "downgrade",
        reason: "semantic_conflict_detected",
      };
    }
  }

  return { hasConflict: false };
}
