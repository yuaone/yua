import { pgPool } from "../../db/postgres";

export type ActivitySnapshot = {
  version: 1;
  thinkingProfile: "FAST" | "NORMAL" | "DEEP";
  startedAt: number | null;
  finalized: boolean;
  finalizedAt: number | null;
  chunks: any[];
  tools: any[];
  summaries: any[];
  primarySummaryId?: string | null;
};

export const ActivitySnapshotEngine = {
  async save(params: {
    threadId: number;
    traceId: string;
    thinkingProfile: string;
    snapshot: ActivitySnapshot;
    domain?: string | null;
    tool_used?: string | null;
    token_usage?: any;
  }) {
    await pgPool.query(
      `
      INSERT INTO chat_activity_snapshots
        (thread_id, trace_id, thinking_profile, snapshot,
        domain, tool_used, token_usage)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      ON CONFLICT (trace_id)
      DO UPDATE SET
        snapshot = EXCLUDED.snapshot,
        thinking_profile = EXCLUDED.thinking_profile,
        domain = EXCLUDED.domain,
        tool_used = EXCLUDED.tool_used,
        token_usage = EXCLUDED.token_usage
      `,
      [
        params.threadId,
        params.traceId,
        params.thinkingProfile,
        params.snapshot,
        params.domain ?? null,
        params.tool_used ?? null,
        params.token_usage ?? null,
      ]
    );
  },

  async getByTrace(traceId: string) {
    const r = await pgPool.query(
      `
      SELECT snapshot
      FROM chat_activity_snapshots
      WHERE trace_id = $1
      LIMIT 1
      `,
      [traceId]
    );

    return r.rows[0]?.snapshot ?? null;
  },
};