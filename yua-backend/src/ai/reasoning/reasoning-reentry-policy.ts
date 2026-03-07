// 📂 src/ai/reasoning/reasoning-reentry-policy.ts
// 🔒 YUA Reasoning Reentry Policy — SSOT FINAL (PRO)
// -------------------------------------------------
// ✔ Routing / allow-only policy
// ✔ No mutation
// ✔ Deterministic
// ✔ SelfCheck-aware
// -------------------------------------------------

import type { ReasoningResult } from "./reasoning-engine";
import type { SelfCheckFlag } from "./self-check-engine";
import type {
  ReasoningContextSnapshot,
} from "./thread-reasoning-context";

/* --------------------------------------------------
 * Types
 * -------------------------------------------------- */

export type ReentryDecision =
  | { allow: true }
  | {
      allow: false;
      reason: "STABLE" | "LOOPING" | "NOISE";
    };

/* --------------------------------------------------
 * Policy
 * -------------------------------------------------- */

export const ReasoningReentryPolicy = {
  decide(params: {
    current: ReasoningResult;
    history: ReasoningContextSnapshot[];
    selfCheckFlags?: SelfCheckFlag[];
  }): ReentryDecision {
    const { current, history, selfCheckFlags } =
      params;

    /* ----------------------------------
     * 1) Noise guard (SelfCheck)
     * ---------------------------------- */
    if (
      selfCheckFlags?.includes("LOW_SIGNAL")
    ) {
      return {
        allow: false,
        reason: "NOISE",
      };
    }

    /* ----------------------------------
     * 2) Loop detection (stage + anchors)
     * ---------------------------------- */
    const recent = history.slice(0, 3);

    const looping =
      recent.length >= 2 &&
      recent.every(
        (h) =>
          h.userStage === current.userStage &&
          JSON.stringify(h.anchors) ===
            JSON.stringify(
              current.nextAnchors
            )
      );

    if (looping) {
      return {
        allow: false,
        reason: "LOOPING",
      };
    }

    /* ----------------------------------
     * 3) Stable guard (confidence plateau)
     * ---------------------------------- */
    if (recent.length >= 2) {
      const [r0, r1] = recent;

      const stable =
        r1.confidence <= r0.confidence &&
        current.confidence <= r0.confidence &&
        Math.abs(
          current.confidence - r0.confidence
        ) < 0.05;

      if (stable) {
        return {
          allow: false,
          reason: "STABLE",
        };
      }
    }

    /* ----------------------------------
     * 4) Allow re-entry
     * ---------------------------------- */
    return { allow: true };
  },
};
