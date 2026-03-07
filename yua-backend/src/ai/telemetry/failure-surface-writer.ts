// 🔒 PHASE 9-3 Failure Surface Writer (SSOT)
// - write-only
// - best-effort
// - 판단 로직 ❌
// - 실패 "좌표"만 기록

import { pgPool } from "../../db/postgres";

export type FailureSurfaceInput = {
  traceId: string;
  threadId?: number | null;

  path: string;
  phase: "judgment" | "generation" | "verifier" | "tool" | "stream";

  failureKind:
    | "CONFIDENCE_DROP"
    | "VERDICT_HOLD"
    | "TOOL_FAIL"
    | "OOD"
    | "TIMEOUT"
    | "ABORT";

  confidenceBefore?: number;
  confidenceAfter?: number;
  riskSnapshot?: number;

  surfaceKey: string;

  relatedEventId?: string; // raw_event_log.event_id
  relatedPayload?: unknown;
};

/**
 * 🔒 writeFailureSurface
 *
 * - 절대 throw ❌
 * - 실패 기록 실패가 시스템 실패로 이어지면 안 됨
 */
export async function writeFailureSurface(
  input: FailureSurfaceInput
): Promise<void> {
  try {
    await pgPool.query(
      `
      INSERT INTO failure_surface_log (
        trace_id,
        thread_id,
        path,
        phase,
        failure_kind,
        confidence_before,
        confidence_after,
        risk_snapshot,
        surface_key,
        related_event_id,
        related_payload
      ) VALUES (
        $1,$2,$3,$4,$5,
        $6,$7,$8,
        $9,$10,$11
      )
      `,
      [
        input.traceId,
        input.threadId ?? null,
        input.path,
        input.phase,
        input.failureKind,
        input.confidenceBefore ?? null,
        input.confidenceAfter ?? null,
        input.riskSnapshot ?? null,
        input.surfaceKey,
        input.relatedEventId ?? null,
        input.relatedPayload
          ? JSON.stringify(input.relatedPayload)
          : null,
      ]
    );
  } catch (e) {
    // 🔒 실패를 다시 실패로 만들지 않는다
    console.warn("[FAILURE_SURFACE_WRITE_SKIPPED]", {
      traceId: input.traceId,
      path: input.path,
      phase: input.phase,
      failureKind: input.failureKind,
      error: String(e),
    });
  }
}
