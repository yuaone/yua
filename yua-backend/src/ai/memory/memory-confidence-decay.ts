// 🔥 YUA Memory Confidence Decay Engine — PHASE 9-7 FINAL
// - controller / batch safe
// - side-effect ❌
// - DB update는 외부에서

import type { MemoryCandidate } from "./memory-candidate.type";
import {
  MemoryConfidenceDecayRule,
} from "./memory-confidence-decay.rule";

export interface DecayExecutionInput {
  candidate: MemoryCandidate;

  /** days since last verification */
  daysElapsed: number;

  /** usage count (rolling window) */
  usageCount: number;
}

export interface DecayExecutionResult {
  confidence: number;
  changed: boolean;
  reason: string;
}

/**
 * 🔒 Pure function
 */
export function applyMemoryConfidenceDecay(
  input: DecayExecutionInput
): DecayExecutionResult {
  const { candidate, daysElapsed, usageCount } = input;

  const result =
    MemoryConfidenceDecayRule.evaluate({
      candidate,
      daysElapsed,
      usageCount,
    });

  const changed =
    Math.abs(result.updatedConfidence - candidate.confidence) >
    0.001;

  return {
    confidence: result.updatedConfidence,
    changed,
    reason: result.reason,
  };
}
