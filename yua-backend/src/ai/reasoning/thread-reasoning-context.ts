// 📂 src/ai/reasoning/thread-reasoning-context.ts
// 🔒 YUA Thread Reasoning Context — SSOT FINAL (PRO)
// -------------------------------------------------
// ✔ PostgreSQL backed
// ✔ History snapshot only (NO decision)
// ✔ Read-heavy safe
// ✔ SelfCheck / Reentry compatible
// -------------------------------------------------

import { pgPool } from "../../db/postgres";
import type {
  ReasoningResult,
  FlowAnchor,
} from "./reasoning-engine";

/* --------------------------------------------------
 * Snapshot Type (SSOT)
 * -------------------------------------------------- */

export type ReasoningContextSnapshot = {
  userStage: ReasoningResult["userStage"];
  intent: ReasoningResult["intent"];
  confidence: number;
  anchors: FlowAnchor[];
  createdAt: string;
};

/* --------------------------------------------------
 * Repository
 * -------------------------------------------------- */

export const ThreadReasoningContext = {
  /* ----------------------------------------------
   * APPEND (write-only)
   * ---------------------------------------------- */
  async append(
    threadId: number,
    reasoning: ReasoningResult
  ): Promise<void> {
    await pgPool.query(
      `
      INSERT INTO thread_reasoning_context (
        thread_id,
        user_stage,
        intent,
        confidence,
        anchors
      )
      VALUES ($1, $2, $3, $4, $5::jsonb)
      `,
      [
        threadId,
        reasoning.userStage,
        reasoning.intent,
        reasoning.confidence,
        JSON.stringify(reasoning.nextAnchors),
      ]
    );
  },

  /* ----------------------------------------------
   * READ RECENT (SelfCheck / Reentry)
   * ---------------------------------------------- */
  async getRecent(
    threadId: number,
    limit = 5
  ): Promise<ReasoningContextSnapshot[]> {
    const { rows } = await pgPool.query(
      `
      SELECT
        user_stage,
        intent,
        confidence,
        anchors,
        created_at
      FROM thread_reasoning_context
      WHERE thread_id = $1
      ORDER BY created_at DESC
      LIMIT $2
      `,
      [threadId, limit]
    );

    return rows.map((r) => ({
      userStage: r.user_stage,
      intent: r.intent,
      confidence: Number(r.confidence),
      anchors: Array.isArray(r.anchors)
        ? (r.anchors as FlowAnchor[])
        : [],
      createdAt: r.created_at,
    }));
  },
};
