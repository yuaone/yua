// 🔒 PHASE 8-2 Calibration Engine (SSOT FINAL)

import { pgPool } from "../../db/postgres";
import { SignalRepo } from "./signal-repo";
/**
 * CalibrationEngine
 *
 * 책임:
 * - runtime_statistics 기반 confidence 통계 보정
 *
 * 원칙:
 * - READ ONLY
 * - Runtime 판단 영향 ❌
 * - 비동기 / 사후 반영
 * - Drift-safe
 */
export class CalibrationEngine {
  /**
   * 🔧 confidence 보정
   *
   * - binning: 0.1 단위
   * - window: 최근 N일
   * - fallback 안전
   */
  static async calibrate(
    confidence: number,
    options?: {
      windowDays?: number;
      minSamples?: number;
      smoothing?: number; // 원래 confidence 유지 비율
    }
  ): Promise<number> {
    if (!Number.isFinite(confidence)) return confidence;

        // 🔒 SIGNAL: Confidence Trend (optional)
    const trend = await SignalRepo.getLatest<{
      delta?: number;
    }>({
      kind: "CONFIDENCE_TREND",
      scope: "GLOBAL",
    });

    const signalBias =
      trend && trend.confidence >= 0.6
        ? Number(trend.value?.delta ?? 0)
        : 0;

    const {
      windowDays = 7,
      minSamples = 20,
      smoothing = 0.7,
    } = options ?? {};

    // 1️⃣ bin 계산 (0.0 ~ 0.9)
    const bin = Math.floor(confidence * 10) / 10;
    const upper = Math.min(bin + 0.1, 1);

    // 2️⃣ bin 통계 조회
    const q = `
      SELECT
        COUNT(*)                        AS total,
        AVG(
          CASE
            WHEN verdict = 'APPROVE' THEN 1
            ELSE 0
          END
        )                               AS success_rate
      FROM runtime_statistics
      WHERE confidence >= $1
        AND confidence < $2
        AND created_at >= NOW() - ($3 || ' days')::interval
    `;

    const res = await pgPool.query(q, [
      bin,
      upper,
      windowDays,
    ]);

    const row = res.rows[0];
    if (!row) return confidence;

    const total = Number(row.total ?? 0);
    const successRate = row.success_rate;

    // 3️⃣ 데이터 부족 → 원본 유지
    if (
      total < minSamples ||
      successRate === null ||
      successRate === undefined
    ) {
      return clamp(confidence, 0, 1);
    }

    const calibrated = Number(successRate);

    // 4️⃣ smoothing (급격한 점프 방지)
    const blended =
      confidence * smoothing +
      calibrated * (1 - smoothing);

    return clamp(blended + signalBias, 0, 1);
  }

  /**
   * 🔍 운영/분석용: bin별 calibration 테이블
   */
  static async getCalibrationTable(
    options?: {
      windowDays?: number;
    }
  ): Promise<
    {
      bin: number;
      samples: number;
      successRate: number | null;
    }[]
  > {
    const windowDays = options?.windowDays ?? 7;

    const q = `
      SELECT
        FLOOR(confidence * 10) / 10     AS bin,
        COUNT(*)                        AS samples,
        AVG(
          CASE
            WHEN verdict = 'APPROVE' THEN 1
            ELSE 0
          END
        )                               AS success_rate
      FROM runtime_statistics
      WHERE created_at >= NOW() - ($1 || ' days')::interval
      GROUP BY bin
      ORDER BY bin
    `;

    const res = await pgPool.query(q, [windowDays]);

    return res.rows.map(r => ({
      bin: Number(r.bin),
      samples: Number(r.samples),
      successRate:
        r.success_rate !== null
          ? Number(r.success_rate)
          : null,
    }));
  }
}

/* -------------------------------------------------- */
/* 🔒 Utilities                                      */
/* -------------------------------------------------- */

function clamp(
  value: number,
  min: number,
  max: number
): number {
  return Math.max(min, Math.min(max, value));
}
