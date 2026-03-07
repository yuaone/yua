// 📂 src/ai/persona/persona-aggregator.ts
// 🧮 Persona Aggregator — SSOT PRODUCTION READY
//
// 역할:
// - Persona inference 결과를 누적 통계로 안정화
// - 학습 ❌ / ML ❌
// - 통계 집계 + decay ONLY
// - Prompt / Judgment / Policy 영향 ❌
//
// SSOT:
// - best-effort (실패해도 서비스 영향 없음)
// - confidence threshold 적용
// - workspace + user 단위 분리

import { pgPool } from "../../db/postgres";
import type {
  Persona,
  PersonaBehaviorHint,
} from "./persona-context.types";

/* ==================================================
 * Types
 * ================================================== */

type PersonaAggregateRow = {
  workspace_id: string;
  user_id: number;
  persona: Persona;
  score: number;
  samples: number;
  updated_at: string;
};

type IngestInput = {
  userId: number;
  workspaceId: string;
  hint: PersonaBehaviorHint;
};

/* ==================================================
 * Config (SSOT)
 * ================================================== */

const CONFIDENCE_THRESHOLD = 0.6;
const DECAY_RATE = 0.98; // 호출당 소폭 감쇠

/* ==================================================
 * Persona Aggregator
 * ================================================== */

export class PersonaAggregator {
  /**
   * ingest
   *
   * - confidence 기준 통과 시에만 누적
   * - score 누적 + decay
   * - upsert 방식
   */
  static async ingest(input: IngestInput): Promise<void> {
    const { userId, workspaceId, hint } = input;

    if (
      !hint ||
      hint.persona === "unknown" ||
      hint.confidence < CONFIDENCE_THRESHOLD
    ) {
      return;
    }

    const weight = Math.min(1, hint.confidence);

    try {
      await pgPool.query(
        `
        INSERT INTO persona_aggregate (
          workspace_id,
          user_id,
          persona,
          score,
          samples,
          updated_at
        )
        VALUES ($1, $2, $3, $4, 1, NOW())
        ON CONFLICT (workspace_id, user_id, persona)
        DO UPDATE SET
          score = persona_aggregate.score * $5 + EXCLUDED.score,
          samples = persona_aggregate.samples + 1,
          updated_at = NOW()
        `,
        [
          workspaceId,
          userId,
          hint.persona,
          weight,
          DECAY_RATE,
        ]
      );
    } catch (e) {
      console.warn(
        "[PERSONA_AGGREGATOR][INGEST_FAIL]",
        e
      );
    }
  }
}
