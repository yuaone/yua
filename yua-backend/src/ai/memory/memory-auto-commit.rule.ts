// 🔒 YUA Memory Auto Commit Rule — PHASE 9-4 FINAL (TYPE SAFE)

import type { MemoryCandidate } from "./memory-candidate.type";

export interface AutoCommitRuleResult {
  ok: boolean;
  reason?: string;
}

/**
 * 🔒 SSOT RULE
 * Rule > Stats > ML > LLM
 */
export const MemoryAutoCommitRule = {
  evaluate(candidate: MemoryCandidate): AutoCommitRuleResult {
    const {
      content,
      confidence,
      source,
      scope,
      ttlDays,
    } = candidate;

    /* --------------------------------------------------
       1️⃣ Source-based confidence gate (TYPE SAFE)
    -------------------------------------------------- */
    const minConfidenceBySource: Record<
      MemoryCandidate["source"],
      number
    > = {
      explicit: 0.6,
      tool_verified: 0.65,
      search_verified: 0.68,
      passive: 0.75,
    };

    if (confidence < minConfidenceBySource[source]) {
      return { ok: false, reason: "low_confidence_by_source" };
    }

    /* --------------------------------------------------
       2️⃣ Length / substance
    -------------------------------------------------- */
    if (!content || content.trim().length < 20) {
      return { ok: false, reason: "too_short" };
    }

    /* --------------------------------------------------
       3️⃣ Question / speculative
    -------------------------------------------------- */
    if (/[?？]$/.test(content.trim())) {
      return { ok: false, reason: "question_like" };
    }

    if (/(아마|같아|추측|일 수도)/.test(content)) {
      return { ok: false, reason: "speculative" };
    }

    /* --------------------------------------------------
       4️⃣ Emotional filler
    -------------------------------------------------- */
    if (/^(아|오|음|와|헉|ㅋㅋ|ㅎㅎ)/.test(content.trim())) {
      return { ok: false, reason: "emotional_only" };
    }

    /* --------------------------------------------------
       5️⃣ Scope restriction
    -------------------------------------------------- */
    if ((scope === "project_architecture" || scope === "project_decision") && source === "passive") {
      return { ok: false, reason: "project_scope_requires_verified" };
    }

    /* --------------------------------------------------
       6️⃣ TTL sanity
    -------------------------------------------------- */
    if (ttlDays !== undefined && ttlDays <= 1) {
      return { ok: false, reason: "ttl_too_short" };
    }

    return { ok: true };
  },
};
