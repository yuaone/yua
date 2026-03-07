// 📂 src/ai/phase9/normalize/raw-to-normalized.ts
// 🔥 PHASE 9 RAW → NORMALIZED Materializer (SSOT)
// - phase9_raw_event_log에서 아직 정규화되지 않은 이벤트를 가져와
//   phase9_normalized_events에 1회만 삽입한다.
// - idempotent(중복 삽입 방지): NOT EXISTS 방식 사용
// - 절대 throw 금지(작업자/배치에서 안전)

import { pgPool } from "../../../db/postgres";
import type { RawEventRow } from "./normalize.types";
import { normalizeRawEvent } from "./event-normalizer";

/* --------------------------------------------------
 * Queries
 * -------------------------------------------------- */

const SELECT_UNNORMALIZED = `
  SELECT
    r.event_id,
    r.workspace_id,
    r.thread_id,
    r.trace_id,
    r.actor,
    r.event_kind,
    r.phase,
    r.payload,
    r.confidence
  FROM phase9_raw_event_log r
  WHERE NOT EXISTS (
    SELECT 1
    FROM phase9_normalized_events n
    WHERE n.event_id = r.event_id
  )
  ORDER BY r.occurred_at ASC
  LIMIT $1
`;

const INSERT_NORMALIZED = `
  INSERT INTO phase9_normalized_events (
    event_id,
    workspace_id,
    thread_id,
    intent,
    turn_intent,
    has_text,
    has_image,
    is_multimodal,
    confidence
  )
  VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
`;

/* --------------------------------------------------
 * Public
 * -------------------------------------------------- */

export async function materializeNormalizedEvents(args?: {
  batchSize?: number;
}): Promise<{
  fetched: number;
  inserted: number;
  skipped: number;
}> {
  const batchSize = args?.batchSize ?? 200;

  let fetched = 0;
  let inserted = 0;
  let skipped = 0;

  try {
    const { rows } = await pgPool.query<RawEventRow>(
      SELECT_UNNORMALIZED,
      [batchSize]
    );

    fetched = rows.length;
    if (rows.length === 0) {
      return { fetched: 0, inserted: 0, skipped: 0 };
    }

    for (const row of rows) {
      const norm = normalizeRawEvent(row);

      if (!norm) {
        skipped++;
        continue;
      }

      // 방어: workspaceId/uuid 공백 방지
      if (!norm.workspaceId || String(norm.workspaceId).trim().length < 10) {
        skipped++;
        continue;
      }

      // DB insert (best-effort)
      try {
        await pgPool.query(INSERT_NORMALIZED, [
          norm.eventId,
          norm.workspaceId,
          norm.threadId ?? null,
          norm.intent,
          norm.turnIntent ?? null,
          norm.hasText,
          norm.hasImage,
          norm.isMultimodal,
          norm.confidence ?? null,
        ]);
        inserted++;
      } catch (e: any) {
        // 🔒 경쟁 조건(동시 실행)에서도 터지지 않게
        // NOT EXISTS로 대부분 막지만, race로 중복 시도 가능
        // unique constraint가 있으면 여기서 duplicate 에러가 날 수 있음 → skip
        const msg = String(e?.message ?? e);
        if (/duplicate key|unique constraint/i.test(msg)) {
          skipped++;
          continue;
        }

        console.warn("[PHASE9][NORMALIZE][INSERT_FAIL]", {
          eventId: norm.eventId,
          error: msg,
        });
        skipped++;
      }
    }

    return { fetched, inserted, skipped };
  } catch (e: any) {
    console.warn("[PHASE9][NORMALIZE][BATCH_FAIL]", String(e?.message ?? e));
    return { fetched, inserted, skipped };
  }
}
