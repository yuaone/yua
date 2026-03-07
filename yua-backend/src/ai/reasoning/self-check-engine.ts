// 📂 src/ai/reasoning/self-check-engine.ts
// 🔒 YUA Self Check Engine — SSOT FINAL (PRODUCTION)
// ------------------------------------------------
// ✔ Reasoning 결과 보정 전용
// ✔ 판단 ❌ / 결정 ❌ / LLM ❌
// ✔ DB 접근 ❌ (Snapshot only)
// ✔ Deterministic
// ✔ Flow 안정화 전용
// ------------------------------------------------

import type {
  ReasoningResult,
  FlowAnchor,
} from "./reasoning-engine";
import type {
  ReasoningContextSnapshot,
} from "./thread-reasoning-context";

/* --------------------------------------------------
 * Types
 * -------------------------------------------------- */

export type SelfCheckFlag =
  | "OVERCONFIDENCE"
  | "OSCILLATION"
  | "LOW_SIGNAL";

export type SelfCheckResult = {
  adjustedConfidence: number;
  anchorPenalty?: Partial<Record<FlowAnchor, number>>;
  flags?: SelfCheckFlag[];
};

/* --------------------------------------------------
 * Utils
 * -------------------------------------------------- */

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/* --------------------------------------------------
 * Engine
 * -------------------------------------------------- */

export const SelfCheckEngine = {
  evaluate(params: {
    current: ReasoningResult;
    /**
     * 🔒 prev는 반드시 Snapshot
     * - DB / Thread Context 저장용
     * - full ReasoningResult ❌
     */
    prev?: ReasoningContextSnapshot;
  }): SelfCheckResult {
    const { current, prev } = params;

    const flags: SelfCheckFlag[] = [];
    let confidence = current.confidence;

    /* ----------------------------------
     * 1) Overconfidence guard
     * ---------------------------------- */
    if (
      confidence > 0.85 &&
      current.userStage === "confused"
    ) {
      confidence -= 0.12;
      flags.push("OVERCONFIDENCE");
    }

    /* ----------------------------------
     * 2) Oscillation guard (flow loop)
     * ---------------------------------- */
    if (
      prev &&
      prev.userStage !== current.userStage &&
      prev.intent === current.intent
    ) {
      confidence -= 0.08;
      flags.push("OSCILLATION");
    }

    /* ----------------------------------
     * 3) Low signal guard
     * ---------------------------------- */
    if (
      current.nextAnchors.length === 0 ||
      current.confidence < 0.35
    ) {
      flags.push("LOW_SIGNAL");
    }

    /* ----------------------------------
     * 4) Anchor soft penalty (NO FORCE)
     * ---------------------------------- */
    const anchorPenalty: Partial<
      Record<FlowAnchor, number>
    > = {};

    if (flags.includes("OSCILLATION")) {
      for (const anchor of current.nextAnchors) {
        anchorPenalty[anchor] = -0.05;
      }
    }

    return {
      adjustedConfidence: clamp01(
        Number(confidence.toFixed(2))
      ),
      anchorPenalty:
        Object.keys(anchorPenalty).length > 0
          ? anchorPenalty
          : undefined,
      flags: flags.length > 0 ? flags : undefined,
    };
  },
};
