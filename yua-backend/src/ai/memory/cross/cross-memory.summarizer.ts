// 📂 src/ai/memory/cross/cross-memory.summarizer.ts
// 🔒 Cross-Thread Memory Summarizer — SSOT FINAL
// ---------------------------------------------
// ✔ NO LLM
// ✔ DecisionContext only
// ✔ Deterministic
// ✔ Output text 의존 ❌

import type { DecisionContext } from "../../decision/decision-context.types";
import type { CrossMemoryType } from "./types";

export type CrossMemorySummaryResult = {
  type: CrossMemoryType;
  summary: string;
  facts?: Record<string, any>;
  scope: "GLOBAL" | "PROJECT";
};

/**
 * Routing verdicts (APPROVE/REJECT for FAST/NORMAL/DEEP/SEARCH paths)
 * are transient engine metadata — NOT meaningful cross-thread memory.
 * Only store substantive, user-facing decisions.
 */
const ROUTING_VERDICTS = new Set(["APPROVE", "REJECT", "FALLBACK"]);

export const CrossMemorySummarizer = {
  summarize(
    decision: DecisionContext
  ): CrossMemorySummaryResult | null {
    /* =========================
       HARD GATES (SSOT)
    ========================= */
    if (decision.inputSignals?.hasImage) return null;
    if (decision.reasoning.intent !== "decide") return null;
    if (decision.memoryIntent !== "DECISION") return null;
    if (decision.reasoning.confidence < 0.85) return null;

    // Skip routing decisions — they are engine-internal, not user-facing memory
    if (ROUTING_VERDICTS.has(decision.decision.verdict)) return null;

    /* =========================
       SUMMARY (DETERMINISTIC)
    ========================= */
    const summary = `사용자 요청에 대해 "${decision.path}" 경로에서 결정이 내려졌다. 결과: ${decision.decision.verdict}`;

    const facts = {
      path: decision.path,
      intent: decision.reasoning.intent,
      confidence: decision.reasoning.confidence,
      anchors: decision.reasoning.nextAnchors ?? [],
      verdict: decision.decision.verdict,
    };

    return {
      type: "DECISION",
      summary,
      facts,
      scope: "PROJECT",
    };
  },
};
