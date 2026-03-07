// 🔒 YUA Memory Confidence Decay Rule — PHASE 9-7 FINAL

import type { MemoryCandidate } from "./memory-candidate.type";
import {
  timeDecayFactor,
  usageBoostFactor,
  clampConfidence,
} from "./memory-decay-utils";

export interface DecayInput {
  candidate: MemoryCandidate;

  /** days since last verified use */
  daysElapsed: number;

  /** recent usage count */
  usageCount: number;
}

export interface DecayResult {
  updatedConfidence: number;
  reason: string;
}

/**
 * 🔒 Rule SSOT
 * - 시간 > 사용빈도 > source
 * - 절대 증가만 ❌
 */
export const MemoryConfidenceDecayRule = {
  evaluate(input: DecayInput): DecayResult {
    const { candidate, daysElapsed, usageCount } = input;

    const base = candidate.confidence;

    // 1️⃣ 시간 감쇠
    const decay = timeDecayFactor(daysElapsed);

    // 2️⃣ 사용 강화
    const boost = usageBoostFactor(usageCount);

    // 3️⃣ source penalty (passive는 더 빨리 잊힘)
    const sourcePenalty =
      candidate.source === "passive" ? 0.9 : 1;

    // 4️⃣ 최종 계산
    const updated = clampConfidence(
      base * decay * boost * sourcePenalty
    );

    return {
      updatedConfidence: updated,
      reason: `decay=${decay.toFixed(
        3
      )}, boost=${boost.toFixed(2)}, sourcePenalty=${sourcePenalty}`,
    };
  },
};
