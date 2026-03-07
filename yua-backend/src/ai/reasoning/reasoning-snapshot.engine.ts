import { pgPool } from "../../db/postgres";

export const ReasoningSnapshotEngine = {
  async save(params: {
    threadId: number;
    traceId: string;
    thinkingProfile: string;
   domain?: string | null;
    tool_used?: string | null;
    token_usage?: any;
    snapshot: any;
  }) {
    await pgPool.query(
      `
      INSERT INTO chat_reasoning_snapshots
      (thread_id, trace_id, thinking_profile, snapshot,
      domain, tool_used, token_usage)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
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
      FROM chat_reasoning_snapshots
      WHERE trace_id = $1
      LIMIT 1
      `,
      [traceId]
    );
    return r.rows[0]?.snapshot ?? null;
  },
};