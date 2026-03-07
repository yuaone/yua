// 🔒 RAW EVENT WRITER — PHASE 9 SSOT
// - write-only
// - no business logic
// - best-effort (never throw)

import { pgPool } from "../../db/postgres";
import { randomUUID } from "crypto";

export type RawEventActor = "USER" | "YUA" | "TOOL" | "MODEL";

export type RawEventPhase =
  | "chat"
  | "decision"
  | "execution"
  | "memory"
  | "prompt";

export type RawEventInput = {
  eventId?: string;
  traceId: string;
  threadId?: number | string | null;
  workspaceId: string;

  actor: RawEventActor;
  eventKind: "message" | "decision" | "execution" | "tool_call" | "error";
  phase: RawEventPhase;

  payload: unknown;

  latencyMs?: number;
  tokenCount?: number;
  confidence?: number;
  risk?: number;
  path?: string;
  verdict?: string;
};

export async function writeRawEvent(
  input: RawEventInput
): Promise<void> {
  if (!input.workspaceId) {
    console.error("[WORKSPACE_ID_MISSING]", {
      traceId: input.traceId,
      actor: input.actor,
      phase: input.phase,
      eventKind: input.eventKind,
      threadId: input.threadId ?? null,
    });
    return;
  }
  try {
    await pgPool.query(
      `
      INSERT INTO phase9_raw_event_log (
        event_id,
        workspace_id,
        trace_id,
        thread_id,
        actor,
        event_kind,
        phase,
        payload,
        latency_ms,
        token_count,
        confidence,
        risk,
        path,
        verdict
      ) VALUES (
        $1,$2,$3,$4,$5,$6,
        $7,$8,$9,$10,$11,$12,$13,$14
      )
      `,
      [
        input.eventId ?? randomUUID(),
        input.workspaceId,
        input.traceId,
        input.threadId ?? null,
        input.actor, // ✅ 그대로 넣는다 (대문자 enum)
        input.eventKind,
        input.phase,
        JSON.stringify(input.payload ?? {}),
        input.latencyMs ?? null,
        input.tokenCount ?? null,
        input.confidence ?? null,
        input.risk ?? null,
        input.path ?? null,
        input.verdict ?? null,
      ]
    );
  } catch (e) {
    console.warn("[RAW_EVENT_WRITE_SKIPPED]", {
      traceId: input.traceId,
      actor: input.actor,
      phase: input.phase,
      error: String(e),
    });
  }
}
