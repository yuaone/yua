// 📂 src/ai/telemetry/flow-aggregation.service.ts
// 🔥 YUA Flow Aggregation Service — SSOT FINAL (Feedback-aware)
// ------------------------------------------------------------
// ✔ FlowBias / Health metrics 전용
// ✔ Judgment / Decision ❌
// ✔ feedback(FOLLOW/DISMISS) 기반
// ✔ Read-only / aggregation only
// ------------------------------------------------------------

import { pgPool } from "../../db/postgres";
import type { FlowAnchor } from "../reasoning/reasoning-engine";

export type AnchorStats = {
  anchor: FlowAnchor;
  shown: number;
  clicked: number;
  ctr: number;
};

export type FlowHealthStats = {
  nextStepRatio: number;
  confusedToReadyRate: number;
};

export const FlowAggregationService = {
  /* --------------------------------------------------
   * Anchor CTR (FOLLOW 기반)
   * -------------------------------------------------- */
  async getAnchorStats(
    days = 7
  ): Promise<AnchorStats[]> {
    const { rows } = await pgPool.query(
      `
      WITH suggestions AS (
        SELECT
          thread_id,
          trace_id,
          jsonb_array_elements(
            suggestions->'suggestions'
          ) AS s,
          suggestions->'feedback' AS feedback
        FROM conversation_flow_log
        WHERE created_at >= NOW() - ($1 || ' days')::interval
      ),
      expanded AS (
        SELECT
          s->>'meta' AS meta_raw,
          s->>'id' AS suggestion_id,
          s->'meta'->'reasoning'->>'anchor' AS anchor,
          feedback
        FROM suggestions
      )
      SELECT
        anchor,
        COUNT(*) AS shown,
        COUNT(*) FILTER (
          WHERE EXISTS (
            SELECT 1
            FROM jsonb_array_elements(feedback) f
            WHERE f->>'suggestionId' = suggestion_id
              AND f->>'action' = 'FOLLOW'
          )
        ) AS clicked
      FROM expanded
      WHERE anchor IS NOT NULL
      GROUP BY anchor
      `,
      [days]
    );

    return rows.map((r) => ({
      anchor: r.anchor,
      shown: Number(r.shown),
      clicked: Number(r.clicked),
      ctr:
        Number(r.shown) > 0
          ? Number(r.clicked) / Number(r.shown)
          : 0,
    }));
  },

  /* --------------------------------------------------
   * Flow Health (heuristic)
   * -------------------------------------------------- */
  async getFlowHealth(): Promise<FlowHealthStats> {
    const nextStep = await pgPool.query(
      `
      SELECT
        COUNT(*) FILTER (
          WHERE suggestions::text ILIKE '%NEXT_STEP%'
        )::float
        /
        NULLIF(COUNT(*), 0)
        AS ratio
      FROM conversation_flow_log
      WHERE created_at >= NOW() - INTERVAL '3 days'
      `
    );

    const stage = await pgPool.query(
      `
      WITH stages AS (
        SELECT
          thread_id,
          created_at,
          user_stage
        FROM conversation_flow_log
      )
      SELECT
        COUNT(*) FILTER (
          WHERE prev_stage = 'confused'
            AND user_stage = 'ready'
        )::float
        /
        NULLIF(
          COUNT(*) FILTER (
            WHERE prev_stage = 'confused'
          ),
          0
        ) AS rate
      FROM (
        SELECT
          thread_id,
          user_stage,
          LAG(user_stage)
            OVER (
              PARTITION BY thread_id
              ORDER BY created_at
            ) AS prev_stage
        FROM stages
      ) t
      `
    );

    return {
      nextStepRatio:
        Number(nextStep.rows[0]?.ratio ?? 0),
      confusedToReadyRate:
        Number(stage.rows[0]?.rate ?? 0),
    };
  },
};
