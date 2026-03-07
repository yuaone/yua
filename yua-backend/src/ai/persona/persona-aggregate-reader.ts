// 📂 src/ai/persona/persona-aggregate-reader.ts
// 🧮 Persona Aggregate Reader — SSOT PRODUCTION READY
//
// 역할:
// - persona_aggregate 테이블에서 "지배적 Persona" 조회
// - 학습 ❌ / 판단 ❌
// - 통계 기반 안정화 결과 제공
//
// SSOT:
// - workspace + user 단위
// - samples 기준 필터
// - score 기반 우선순위
// - 실패 시 null 반환 (best-effort)

import { pgPool } from "../../db/postgres";
import type { Persona } from "./persona-context.types";

/* ==================================================
 * Types
 * ================================================== */

export type DominantPersona = {
  persona: Persona;
  confidence: number; // 0~1
  samples: number;
};

/* ==================================================
 * Config (SSOT)
 * ================================================== */

const MIN_SAMPLES = 3; // 최소 누적 횟수
const MAX_RESULTS = 1;

/* ==================================================
 * Reader
 * ================================================== */

export async function readDominantPersona(
  workspaceId: string,
  userId: number
): Promise<DominantPersona | null> {
  try {
    const r = await pgPool.query<{
      persona: Persona;
      score: number;
      samples: number;
    }>(
      `
      SELECT
        persona,
        score,
        samples
      FROM persona_aggregate
      WHERE workspace_id = $1
        AND user_id = $2
        AND samples >= $3
      ORDER BY score DESC
      LIMIT $4
      `,
      [workspaceId, userId, MIN_SAMPLES, MAX_RESULTS]
    );

    if (r.rows.length === 0) {
      return null;
    }

    const row = r.rows[0];

    // confidence 계산 규칙 (SSOT)
    // - score / samples
    // - 1.0 상한
    const confidence =
      row.samples > 0
        ? Math.min(1, row.score / row.samples)
        : 0;

    return {
      persona: row.persona,
      confidence,
      samples: row.samples,
    };
  } catch (e) {
    console.warn(
      "[PERSONA_AGGREGATE_READER][READ_FAIL]",
      e
    );
    return null;
  }
}
