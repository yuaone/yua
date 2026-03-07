// 📂 src/ai/suggestion/flow-log.repo.ts
// 🔒 YUA Flow Log Repository — SSOT FINAL (PRO + FEEDBACK)
// --------------------------------------------------
// ✔ Conversation Flow / Suggestion Telemetry ONLY
// ✔ Feedback (follow / dismiss) JSONB 확장
// ✔ DB schema 변경 ❌
// ✔ Judgment / Memory / Learning ❌
// ✔ Write-heavy / Safe append
// --------------------------------------------------

import { pgPool } from "../../db/postgres";

/* --------------------------------------------------
 * Types (SSOT)
 * -------------------------------------------------- */

export type FlowSuggestionFeedbackAction =
  | "FOLLOW"
  | "DISMISS";

export type FlowSuggestionFeedback = {
  suggestionId: string;
  action: FlowSuggestionFeedbackAction;
  at: number;
};

/**
 * 🔒 관측 로그 (절대 판단 아님)
 */
export type FlowLogRecord = {
  threadId: number;
  traceId: string;

  intent?: string;
  userStage?: string;
  confidence?: number;

  /**
   * Suggestion payload (raw)
   */
  suggestions: unknown;

  /**
   * Optional meta (schema-free)
   */
  meta?: {
    engine?: "continuation";
    anchorCount?: number;
    confidenceBand?: "low" | "mid" | "high";
    learningHint?: {
      anchors?: string[];
      confidenceBand?: "low" | "mid" | "high";
    };
    note?: string;
  };
};

/* --------------------------------------------------
 * Internal Helpers
 * -------------------------------------------------- */

/**
 * confidence → 관측용 밴드
 * ❌ 판단/학습 로직에서 사용 금지
 */
function confidenceBand(
  c?: number
): "low" | "mid" | "high" | undefined {
  if (typeof c !== "number") return undefined;
  if (c < 0.45) return "low";
  if (c < 0.75) return "mid";
  return "high";
}

/* --------------------------------------------------
 * Repository
 * -------------------------------------------------- */

export const FlowLogRepo = {
  /* ----------------------------------------------
   * INSERT (Suggestion emission)
   * ---------------------------------------------- */
  async insert(record: FlowLogRecord): Promise<void> {
    const {
      threadId,
      traceId,
      intent,
      userStage,
      confidence,
      suggestions,
      meta,
    } = record;

    const payload = {
      suggestions,
      feedback: [], // 🔥 feedback slot (initially empty)
      meta: {
        engine: "continuation" as const,
        anchorCount: Array.isArray(suggestions)
          ? suggestions.length
          : undefined,
        confidenceBand: confidenceBand(confidence),
        learningHint: {
          anchors: Array.isArray(suggestions)
            ? suggestions
                .map((s: any) => s?.meta?.reasoning?.anchor)
                .filter(Boolean)
            : undefined,
          confidenceBand: confidenceBand(confidence),
        },
        ...meta,
      },
    };

    await pgPool.query(
      `
      INSERT INTO conversation_flow_log (
        thread_id,
        trace_id,
        intent,
        user_stage,
        confidence,
        suggestions
      )
      VALUES ($1, $2, $3, $4, $5, $6::jsonb)
      `,
      [
        threadId,
        traceId,
        intent ?? null,
        userStage ?? null,
        typeof confidence === "number" ? confidence : null,
        JSON.stringify(payload),
      ]
    );
  },

  /* ----------------------------------------------
   * APPEND FEEDBACK (SSOT FINAL)
   * - idempotent-ish
   * - append only
   * - no overwrite
   * ---------------------------------------------- */
  async appendFeedback(params: {
    threadId: number;
    traceId: string;
    suggestionId: string;
    action: FlowSuggestionFeedbackAction;
  }): Promise<void> {
    const { threadId, traceId, suggestionId, action } =
      params;

    const feedback: FlowSuggestionFeedback = {
      suggestionId,
      action,
      at: Date.now(),
    };

    /**
     * 🔒 안전 규칙
     * - 해당 trace가 없으면 아무 것도 하지 않음
     * - 기존 feedback은 유지
     * - 단순 append
     */
    const result = await pgPool.query(
      `
      UPDATE conversation_flow_log
      SET suggestions =
        jsonb_set(
          suggestions,
          '{feedback}',
          COALESCE(suggestions->'feedback', '[]'::jsonb) || $1::jsonb,
          true
        )
      WHERE thread_id = $2
        AND trace_id = $3
      `,
      [
        JSON.stringify(feedback),
        threadId,
        traceId,
      ]
    );

    // 🔒 관측 로그용 (에러 아님)
    if (result.rowCount === 0) {
      console.warn(
        "[FLOW_LOG_FEEDBACK_SKIPPED]",
        {
          threadId,
          traceId,
          suggestionId,
          action,
        }
      );
    }
  },

  /* ----------------------------------------------
   * READ (Debug / Analysis ONLY)
   * ❌ Runtime logic에서 사용 금지
   * ---------------------------------------------- */
  async findRecentByThread(
    threadId: number,
    limit = 5
  ): Promise<
    {
      id: number;
      trace_id: string;
      intent: string | null;
      user_stage: string | null;
      confidence: number | null;
      suggestions: unknown;
      created_at: string;
    }[]
  > {
    const { rows } = await pgPool.query(
      `
      SELECT
        id,
        trace_id,
        intent,
        user_stage,
        confidence,
        suggestions,
        created_at
      FROM conversation_flow_log
      WHERE thread_id = $1
      ORDER BY created_at DESC
      LIMIT $2
      `,
      [threadId, limit]
    );

    return rows;
  },
};
