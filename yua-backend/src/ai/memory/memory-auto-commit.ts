// 🔥 YUA Memory Auto Commit Engine — PHASE 9-4 FINAL (UPGRADED)
// -----------------------------------------------------------
// - deterministic
// - controller only
// - LLM ❌
// - side-effect ❌
// - AnswerState aware (SSOT-safe)
// - Source / Scope aware
// - Policy & Runtime guard compatible

import type { MemoryCandidate } from "./memory-candidate.type";
import { canAutoCommit } from "./runtime/memory-rule-guard";
import type { AnswerState } from "../suggestion/answer-state";

export interface AutoCommitDecision {
  shouldCommit: boolean;
  reason: string;
  meta?: {
    confidence: number;
    scope: MemoryCandidate["scope"];
    source: MemoryCandidate["source"];
  };
}

export interface ContinuityHint {
  anchorConfidence?: number;
  contextCarryLevel?: "RAW" | "SEMANTIC" | "ENTITY";
}

/**
 * 🔒 SSOT PRINCIPLES
 * - Auto commit is conservative by default
 * - AnswerState = block hint only
 * - Verified sources are privileged
 * - Architecture / Decision memories are stricter
 */
export async function shouldAutoCommitMemory(
  workspaceId: string,
  candidate: MemoryCandidate,
  answerState?: AnswerState,
  continuity?: ContinuityHint
): Promise<AutoCommitDecision> {
  /* --------------------------------------------------
   * 0️⃣ Workspace Guard
   * -------------------------------------------------- */
  if (!workspaceId) {
    return reject("missing_workspace_id", candidate);
  }

  /* --------------------------------------------------
   * 1️⃣ AnswerState Guard (SSOT)
   * -------------------------------------------------- */
  if (answerState) {
    if (answerState.completeness === "PARTIAL") {
      return reject("answer_partial", candidate);
    }

    if (answerState.confidenceImpression === "LOW") {
      return reject("answer_low_confidence", candidate);
    }
  }

  /* --------------------------------------------------
   * 2️⃣ Scope Guard (STRICT)
   * -------------------------------------------------- */
  if (
  candidate.scope === "project_architecture" ||
  candidate.scope === "project_decision"
) {
  if (candidate.confidence < 0.8) {
    return reject("low_confidence_for_sensitive_scope", candidate);
  }
}

  if (
    candidate.scope === "user_profile" ||
    candidate.scope === "user_preference"
  ) {
    if (candidate.confidence < 0.50) {
      return reject("low_confidence_for_user_scope", candidate);
    }
  }

  /* --------------------------------------------------
   * 2️⃣-B Continuity Guard (SSOT)
   * -------------------------------------------------- */
  if (continuity) {
    if ((continuity.anchorConfidence ?? 0) < 0.3) {
      return reject("low_continuity_no_commit", candidate);
    }
  }


  /* --------------------------------------------------
   * 3️⃣ Source Guard
   * -------------------------------------------------- */
  if (candidate.source === "passive") {
    const isImplicit = candidate.reason?.startsWith("implicit_");
    const threshold = isImplicit ? 0.55 : 0.65;
    if (candidate.confidence < threshold) {
      return reject("passive_confidence_too_low", candidate);
    }
  }

  // verified sources get a small privilege
  const effectiveConfidence =
    candidate.source === "tool_verified" ||
    candidate.source === "search_verified"
      ? Math.min(candidate.confidence + 0.05, 1)
      : candidate.confidence;

  /* --------------------------------------------------
   * 4️⃣ Runtime Policy Guard
   * -------------------------------------------------- */
  const allowed = await canAutoCommit(workspaceId, {
    confidence: effectiveConfidence,
    contentLength: candidate.content.length,
  });

  if (!allowed) {
    return reject("runtime_rule_reject", candidate);
  }

  /* --------------------------------------------------
   * ✅ APPROVED
   * -------------------------------------------------- */
  return {
    shouldCommit: true,
    reason: "auto_commit_allowed",
    meta: {
      confidence: effectiveConfidence,
      scope: candidate.scope,
      source: candidate.source,
    },
  };
}

/* --------------------------------------------------
 * Helpers
 * -------------------------------------------------- */
function reject(
  reason: string,
  candidate: MemoryCandidate
): AutoCommitDecision {
  return {
    shouldCommit: false,
    reason,
    meta: {
      confidence: candidate.confidence,
      scope: candidate.scope,
      source: candidate.source,
    },
  };
}
