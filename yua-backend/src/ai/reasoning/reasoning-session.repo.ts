import { pgPool } from "../../db/postgres";
import { randomUUID } from "crypto";

export const ReasoningSessionRepo = {

  async create(params: {
    threadId: number;
    traceId: string;
    turnId: number;
    mode: "NORMAL" | "VERIFY";
  }) {
    const id = randomUUID();

    await pgPool.query(
      `
      INSERT INTO reasoning_sessions
      (id, thread_id, trace_id, turn_id, mode)
      VALUES ($1,$2,$3,$4,$5)
      `,
      [id, params.threadId, params.traceId, params.turnId, params.mode]
    );

    return id;
  },

  async saveUltraState(params: {
    sessionId: string;
    ultraState: any;
    ultraHash: string;
    systemProfileHash: string;
    stageInstructionHash: string;
  }) {
    await pgPool.query(
      `
      INSERT INTO ultra_states
      (session_id, ultra_state, ultra_hash, system_profile_hash, stage_instruction_hash)
      VALUES ($1,$2,$3,$4,$5)
      ON CONFLICT (session_id)
      DO UPDATE SET
        ultra_state = EXCLUDED.ultra_state,
        ultra_hash = EXCLUDED.ultra_hash,
        stage_instruction_hash = EXCLUDED.stage_instruction_hash
      `,
      [
        params.sessionId,
        params.ultraState,
        params.ultraHash,
        params.systemProfileHash,
        params.stageInstructionHash
      ]
    );
  },

  async appendDelta(params: {
    sessionId: string;
    source: "ENGINE" | "MODEL";
    kind: "STAGE" | "DELTA" | "BLOCK" | "META";
    seq: number;
    payload: any;
  }) {
    await pgPool.query(
      `
      INSERT INTO reasoning_deltas
      (session_id, source, kind, seq, payload)
      VALUES ($1,$2,$3,$4,$5)
      `,
      [
        params.sessionId,
        params.source,
        params.kind,
        params.seq,
        params.payload
      ]
    );
  },

  async saveSnapshot(params: {
    sessionId: string;
    snapshot: any;
    nodeCount: number;
  }) {
    await pgPool.query(
      `
      INSERT INTO cognitive_snapshots
      (session_id, snapshot_v3, node_count)
      VALUES ($1,$2,$3)
      ON CONFLICT (session_id)
      DO UPDATE SET
        snapshot_v3 = EXCLUDED.snapshot_v3,
        node_count = EXCLUDED.node_count
      `,
      [
        params.sessionId,
        params.snapshot,
        params.nodeCount
      ]
    );
  }
};