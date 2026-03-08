// 📂 src/ai/memory/memory-pipeline-runner.ts
// 🔥 YUA Memory Pipeline Runner — Standalone async pipeline
// ----------------------------------------------------------
// Extracted from chat-engine.ts for reuse in execution-engine stream hooks.
// - Self-contained: no chat-engine internals
// - Fail-safe: NEVER crashes the caller
// - Deterministic ordering: guard → detect → dedup → commit → SSE

import type { MemoryCandidate } from "./memory-candidate.type";
import type { MemoryScope } from "./memory-scope-router";
import { generateMemoryCandidate } from "./memory-candidate";
import { generateLanguageDecisionCandidate } from "./memory-language-decision-candidate";
import { dedupMemoryCandidate } from "./memory-dedup";
import { shouldAutoCommitMemory } from "./memory-auto-commit";
import { MemoryManager } from "./memory-manager";
import { CrossMemoryWriter } from "./cross/cross-memory.writer";
import { buildMemoryStreamEvent } from "./memory-stream-emitter";
import { StreamEngine } from "../engines/stream-engine";

/* ===================================================
   Context Type
=================================================== */

export interface MemoryPipelineContext {
  threadId: number;
  traceId: string;
  userId: string | number;
  workspaceId: string;
  userMessage: string;
  assistantMessage?: string;
  mode: string;
  memoryIntent: string; // from detectMemoryIntent
  reasoning: { intent?: string; confidence: number };
  executionPlan?: any;
  executionResult?: any;
  allowMemory: boolean;
}

/* ===================================================
   Scope Mapping Helper (replicated from chat-engine)
=================================================== */

function mapCandidateScopeToMemoryScope(
  scope: MemoryCandidate["scope"],
  meta?: MemoryCandidate["meta"],
): MemoryScope {
  if (meta?.decisionHint === "ARCHITECTURE") {
    return "project_architecture";
  }

  if (meta?.decisionHint === "DECISION") {
    return "project_decision";
  }

  switch (scope) {
    case "user_preference":
      return "user_preference";
    case "user_profile":
      return "user_profile";
    case "user_research":
      return "user_research";
    case "project_architecture":
      return "project_architecture";
    case "project_decision":
      return "project_decision";
    case "general_knowledge":
    default:
      return "general_knowledge";
  }
}

/* ===================================================
   SSE Helper (best-effort, never throws)
=================================================== */

async function emitMemoryEvent(
  threadId: number,
  traceId: string,
  params: {
    op: "PENDING" | "SAVED" | "SKIPPED";
    scope: MemoryScope;
    content: string;
    confidence?: number;
    reason?: string;
  },
): Promise<void> {
  try {
    await StreamEngine.publish(
      threadId,
      buildMemoryStreamEvent({
        traceId,
        op: params.op,
        scope: params.scope,
        content: params.content,
        confidence: params.confidence,
        reason: params.reason,
      }),
    );
  } catch {
    // SSE publish failure must never propagate
  }
}

/* ===================================================
   Pipeline
=================================================== */

export async function runMemoryPipeline(
  ctx: MemoryPipelineContext,
): Promise<void> {
  try {
    /* --------------------------------------------------
     * (a) Guard checks
     * -------------------------------------------------- */
    if (!ctx.allowMemory) return;
    if (!ctx.workspaceId) return;
    if (!ctx.userId) return;

    const numericUserId = Number(ctx.userId);
    if (!Number.isFinite(numericUserId) || numericUserId <= 0) return;

    let implicitCandidate: MemoryCandidate | null = null;
    let executionCandidate: MemoryCandidate | null = null;
    let memoryCandidate: MemoryCandidate | null = null;

    /* --------------------------------------------------
     * (b) Implicit memory detection
     *     Dynamically imported — modules may not exist yet.
     * -------------------------------------------------- */
    try {
      const { detectImplicitMemory } = await import("./memory-implicit-detector.js");
      const { scoreImplicitCandidate } = await import("./memory-implicit-scorer.js");

      const implicit = detectImplicitMemory(ctx.userMessage);

      if (implicit && implicit.category !== "NONE") {
        const score = scoreImplicitCandidate(implicit, ctx.userMessage);
        if (score >= 0.55) {
          implicitCandidate = {
            content: implicit.extractedContent,
            scope: implicit.scope,
            confidence: score,
            reason: `implicit_${implicit.category.toLowerCase()}`,
            source: "passive",
            meta: { origin: "language" },
          };
        }
      }
    } catch {
      // Implicit memory modules not available — skip gracefully
    }

    /* --------------------------------------------------
     * (c) Execution-based candidate generation
     * -------------------------------------------------- */
    if (
      ctx.executionPlan &&
      ctx.executionResult &&
      ctx.executionResult.ok === true
    ) {
      executionCandidate = generateMemoryCandidate({
        userMessage: ctx.userMessage,
        executionPlan: ctx.executionPlan,
        executionResult: ctx.executionResult,
        reasoningConfidence: ctx.reasoning.confidence,
      });
    }

    /* --------------------------------------------------
     * (d) Language decision candidate (fallback)
     * -------------------------------------------------- */
    if (
      !executionCandidate &&
      !implicitCandidate &&
      ctx.reasoning.intent === "decide" &&
      ctx.reasoning.confidence >= 0.85 &&
      ctx.assistantMessage
    ) {
      memoryCandidate = generateLanguageDecisionCandidate({
        answer: ctx.assistantMessage,
        reasoning: {
          intent: ctx.reasoning.intent as any,
          confidence: ctx.reasoning.confidence,
        },
        confidence: ctx.reasoning.confidence,
        source: "language",
      });
    }

    /* --------------------------------------------------
     * (e) Explicit REMEMBER intent → CrossMemoryWriter
     * -------------------------------------------------- */
    if (ctx.memoryIntent === "REMEMBER") {
      const summary = ctx.userMessage.trim().slice(0, 300);

      try {
        await CrossMemoryWriter.insert({
          workspaceId: ctx.workspaceId,
          userId: numericUserId,
          type: "USER_LONGTERM",
          summary,
          scope: "GLOBAL",
          sourceThreadId: ctx.threadId,
        });

        console.log("[MEMORY_PIPELINE][USER_LONGTERM][COMMITTED]", {
          workspaceId: ctx.workspaceId,
          userId: ctx.userId,
          summaryPreview: summary.slice(0, 60),
        });
      } catch (e) {
        console.error("[MEMORY_PIPELINE][USER_LONGTERM][ERROR]", e);
      }
    }

    /* --------------------------------------------------
     * (f) Select best candidate (higher confidence wins)
     * -------------------------------------------------- */
    if (!memoryCandidate) {
      if (implicitCandidate && executionCandidate) {
        memoryCandidate =
          implicitCandidate.confidence >= executionCandidate.confidence
            ? implicitCandidate
            : executionCandidate;
      } else {
        memoryCandidate = executionCandidate ?? implicitCandidate ?? null;
      }
    }

    // Nothing to commit — exit early
    if (!memoryCandidate) return;

    // SSE: PENDING
    await emitMemoryEvent(ctx.threadId, ctx.traceId, {
      op: "PENDING",
      scope: mapCandidateScopeToMemoryScope(
        memoryCandidate.scope,
        memoryCandidate.meta,
      ),
      content: memoryCandidate.content,
      confidence: memoryCandidate.confidence,
    });

    /* --------------------------------------------------
     * (g) Dedup check
     * -------------------------------------------------- */
    const resolvedScope = mapCandidateScopeToMemoryScope(
      memoryCandidate.scope,
      memoryCandidate.meta,
    );

    try {
      const existingMemories = await MemoryManager.retrieveByScope({
        workspaceId: ctx.workspaceId,
        scope: resolvedScope,
        limit: 12,
      });

      const dedupResult = await dedupMemoryCandidate({
        candidate: memoryCandidate,
        existingContents: existingMemories.map((m) => m.content),
      });

      if (dedupResult.isDuplicate) {
        console.log("[MEMORY_PIPELINE][DEDUP][SKIPPED]", {
          reason: dedupResult.reason,
          similarity: dedupResult.similarity,
          scope: memoryCandidate.scope,
        });

        await emitMemoryEvent(ctx.threadId, ctx.traceId, {
          op: "SKIPPED",
          scope: resolvedScope,
          content: memoryCandidate.content,
          reason: dedupResult.reason ?? "duplicate",
        });

        return;
      }
    } catch (e) {
      // Dedup failure must not block commit (best-effort)
      console.warn("[MEMORY_PIPELINE][DEDUP][ERROR]", e);
    }

    /* --------------------------------------------------
     * (g2) Conflict detection
     * -------------------------------------------------- */
    try {
      const { detectMemoryConflict } = await import("./memory-conflict-detector.js");

      // Need existing memories with id + confidence for conflict check
      // (MemoryManager.retrieveByScope strips these fields, so query directly)
      const { pgPool } = await import("../../db/postgres.js");
      const conflictRows = await pgPool.query<{
        id: number;
        content: string;
        confidence: number;
      }>(
        `SELECT id, content, confidence
         FROM memory_records
         WHERE workspace_id = $1 AND scope = $2 AND is_active = true AND confidence >= 0.4
         ORDER BY confidence DESC, created_at DESC
         LIMIT 12`,
        [ctx.workspaceId, resolvedScope],
      );

      const conflictResult = await detectMemoryConflict(
        memoryCandidate,
        conflictRows.rows.map((m) => ({
          id: m.id,
          content: m.content,
          scope: resolvedScope,
          confidence: m.confidence,
        })),
      );

      if (conflictResult.hasConflict) {
        if (conflictResult.action === "SUPERSEDE") {
          // New memory replaces old — deactivate conflicting record
          if (conflictResult.conflictingMemoryId) {
            try {
              await pgPool.query(
                `UPDATE memory_records SET is_active = false, updated_at = NOW() WHERE id = $1`,
                [conflictResult.conflictingMemoryId],
              );
              console.log("[MEMORY_PIPELINE][CONFLICT][SUPERSEDE]", {
                oldId: conflictResult.conflictingMemoryId,
                score: conflictResult.contradictionScore,
              });
            } catch (e) {
              console.warn("[MEMORY_PIPELINE][CONFLICT][SUPERSEDE_ERROR]", e);
            }
          }
          // Continue to commit the new memory
        } else if (conflictResult.action === "FLAG_USER") {
          // Emit CONFLICT event and skip commit
          await emitMemoryEvent(ctx.threadId, ctx.traceId, {
            op: "SKIPPED",
            scope: resolvedScope,
            content: memoryCandidate.content,
            reason: `conflict_detected:${conflictResult.contradictionScore?.toFixed(2)}`,
          });
          console.log("[MEMORY_PIPELINE][CONFLICT][FLAG_USER]", {
            score: conflictResult.contradictionScore,
            conflictingId: conflictResult.conflictingMemoryId,
          });
          return;
        } else if (conflictResult.action === "COEXIST_DOWNGRADE") {
          // Downgrade conflicting memory confidence × 0.8
          if (conflictResult.conflictingMemoryId) {
            try {
              await pgPool.query(
                `UPDATE memory_records SET confidence = confidence * 0.8, updated_at = NOW() WHERE id = $1`,
                [conflictResult.conflictingMemoryId],
              );
              console.log("[MEMORY_PIPELINE][CONFLICT][COEXIST_DOWNGRADE]", {
                downgradedId: conflictResult.conflictingMemoryId,
                score: conflictResult.contradictionScore,
              });
            } catch (e) {
              console.warn("[MEMORY_PIPELINE][CONFLICT][DOWNGRADE_ERROR]", e);
            }
          }
          // Continue to commit the new memory
        }
      }
    } catch (e) {
      // Conflict detection failure must not block commit (best-effort)
      console.warn("[MEMORY_PIPELINE][CONFLICT][ERROR]", e);
    }

    /* --------------------------------------------------
     * (h) Auto-commit gate
     * -------------------------------------------------- */
    const decision = await shouldAutoCommitMemory(
      ctx.workspaceId,
      memoryCandidate,
    );

    /* --------------------------------------------------
     * (i) Commit to DB + (j) SSE events
     * -------------------------------------------------- */
    if (decision.shouldCommit) {
      await MemoryManager.commit({
        workspaceId: ctx.workspaceId,
        createdByUserId: numericUserId,
        scope: resolvedScope,
        content: memoryCandidate.content,
        confidence: decision.meta?.confidence ?? memoryCandidate.confidence,
        source: memoryCandidate.source,
        threadId: ctx.threadId,
        traceId: ctx.traceId,
      });

      console.log("[MEMORY_PIPELINE][COMMIT][SUCCESS]", {
        scope: memoryCandidate.scope,
        confidence: memoryCandidate.confidence,
        source: memoryCandidate.source,
      });

      await emitMemoryEvent(ctx.threadId, ctx.traceId, {
        op: "SAVED",
        scope: resolvedScope,
        content: memoryCandidate.content,
        confidence: decision.meta?.confidence ?? memoryCandidate.confidence,
      });
    } else {
      console.log(
        "[MEMORY_PIPELINE][COMMIT][SKIPPED]",
        decision.reason,
      );

      await emitMemoryEvent(ctx.threadId, ctx.traceId, {
        op: "SKIPPED",
        scope: resolvedScope,
        content: memoryCandidate.content,
        reason: decision.reason ?? "policy_rejected",
      });
    }
  } catch (e) {
    // 🔒 CRITICAL: Memory pipeline failures must NEVER crash the stream
    console.error("[MEMORY_PIPELINE][FATAL]", e);
  }
}
