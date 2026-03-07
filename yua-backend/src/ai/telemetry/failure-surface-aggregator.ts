// 🔒 PHASE 9-3 Failure Surface Aggregator (SSOT)
// - failure_surface_log 기반
// - window / threshold 계산 전용
// - 판단 ❌ / mutation ❌

import { pgPool } from "../../db/postgres";

export type FailureSurfaceAggregate = {
  path: string;
  failureKind: string;
  count: number;
  windowHours: number;
};

export class FailureSurfaceAggregator {
  static async aggregate(params: {
    lastHours: number;
  }): Promise<FailureSurfaceAggregate[]> {
    const { lastHours } = params;

    try {
      const q = `
        SELECT
          path,
          failure_kind,
          COUNT(*) AS count
        FROM failure_surface_log
        WHERE occurred_at >= NOW() - INTERVAL '${lastHours} hours'
        GROUP BY path, failure_kind
        ORDER BY count DESC
      `;

      const res = await pgPool.query(q);

      return res.rows.map(r => ({
        path: String(r.path),
        failureKind: String(r.failure_kind),
        count: Number(r.count),
        windowHours: lastHours,
      }));
    } catch (e) {
      console.warn("[FAILURE_SURFACE_AGGREGATE_FAILED]", e);
      return [];
    }
  }
 // 🔥 SSOT: Completion Verdict Aggregation (NEXT TURN ONLY)
  static async aggregateCompletionVerdicts(params: {
    lastHours: number;
  }): Promise<
    {
      verdict: "PASS" | "WEAK" | "FAIL";
      count: number;
    }[]
  > {
    try {
      const q = `
        SELECT
          verdict,
          COUNT(*) AS count
        FROM phase9_raw_event_log
        WHERE
          event_kind = 'execution'
          AND verdict IS NOT NULL
          AND occurred_at >= NOW() - INTERVAL '${params.lastHours} hours'
        GROUP BY verdict
      `;

      const res = await pgPool.query(q);

      return res.rows.map(r => ({
        verdict: r.verdict as "PASS" | "WEAK" | "FAIL",
        count: Number(r.count),
      }));
    } catch (e) {
      console.warn("[COMPLETION_VERDICT_AGG_FAIL]", e);
      return [];
    }
  }
}
