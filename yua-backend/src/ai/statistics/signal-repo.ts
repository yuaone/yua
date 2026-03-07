// 🔒 YUA Signal Repository — SSOT FINAL
// ------------------------------------
// ✔ READ ONLY
// ✔ Runtime-safe
// ✔ SignalLibrary 단일 접근점
// ✔ 없으면 "신호 없음"으로 처리
// ✔ 판단 / path / verdict 개입 ❌

import { pgPool } from "../../db/postgres";

/* --------------------------------------------------
 * Signal Types (SSOT)
 * -------------------------------------------------- */

export type SignalKind =
  | "DRIFT"
  | "CONFIDENCE_TREND"
  | "SEARCH_FACET_TREND"
  | "PATH_BIAS"
  | "MEMORY_DECAY_HINT"
  | "ANCHOR_PATTERN"
  | "RISK_PATTERN"
  | "EVENT_MARKET"; // 🔥 추가

export type SignalScope =
  | "GLOBAL"
  | "PATH"
  | "MEMORY"
  | "PERSONA";

export interface SignalRecord<T = any> {
  id: number;
  kind: SignalKind;
  scope: SignalScope;
  target: string | null;
  value: T;
  confidence: number;
  windowFrom: string;
  windowTo: string;
  createdAt: string;
}

/* --------------------------------------------------
 * Repository
 * -------------------------------------------------- */

export class SignalRepo {
  /**
   * 🔍 최신 Signal 1개 조회
   * - 없으면 null
   */
  static async getLatest<T = any>(params: {
    kind: SignalKind;
    scope?: SignalScope;
    target?: string;
  }): Promise<SignalRecord<T> | null> {
    const { kind, scope, target } = params;

    const { rows } = await pgPool.query(
      `
      SELECT
        id,
        kind,
        scope,
        target,
        value,
        confidence,
        window_from,
        window_to,
        created_at
      FROM signal_library
      WHERE kind = $1
        AND ($2::text IS NULL OR scope = $2)
        AND ($3::text IS NULL OR target = $3)
      ORDER BY created_at DESC
      LIMIT 1
      `,
      [kind, scope ?? null, target ?? null]
    );

    if (!rows.length) return null;

    const r = rows[0];
    return {
      id: r.id,
      kind: r.kind,
      scope: r.scope,
      target: r.target,
      value: r.value,
      confidence: Number(r.confidence),
      windowFrom: r.window_from,
      windowTo: r.window_to,
      createdAt: r.created_at,
    };
  }

  /**
   * 🔍 기간 내 Signal 목록
   * - 운영 / 리포트 / 배치 전용
   */
  static async list<T = any>(params: {
    kind: SignalKind;
    scope?: SignalScope;
    target?: string;
    limit?: number;
  }): Promise<SignalRecord<T>[]> {
    const { kind, scope, target, limit = 50 } = params;

    const { rows } = await pgPool.query(
      `
      SELECT
        id,
        kind,
        scope,
        target,
        value,
        confidence,
        window_from,
        window_to,
        created_at
      FROM signal_library
      WHERE kind = $1
        AND ($2::text IS NULL OR scope = $2)
        AND ($3::text IS NULL OR target = $3)
      ORDER BY created_at DESC
      LIMIT $4
      `,
      [kind, scope ?? null, target ?? null, limit]
    );

    return rows.map(r => ({
      id: r.id,
      kind: r.kind,
      scope: r.scope,
      target: r.target,
      value: r.value,
      confidence: Number(r.confidence),
      windowFrom: r.window_from,
      windowTo: r.window_to,
      createdAt: r.created_at,
    }));
  }
}
