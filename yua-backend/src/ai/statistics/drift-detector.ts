// src/ai/statistics/drift-detector.ts
// 🔒 PHASE 7.8 Drift Detector (SSOT)

import { pgPool } from "../../db/postgres";
import { SignalRepo } from "./signal-repo";

/**
 * DriftDetector
 *
 * 책임:
 * - runtime_statistics 기반 drift 감지
 *
 * 금지:
 * - verdict 생성 ❌
 * - path 변경 ❌
 * - confidence 직접 조정 ❌
 */
export class DriftDetector {
  /**
   * path 단위 drift 여부 판단
   * - 최근 24h vs 이전 7d 평균 비교
   */
  static async hasDrift(path: string): Promise<boolean> {
        // 🔒 SIGNAL 우선 확인
    const signal = await SignalRepo.getLatest<{
      drift_score?: number;
    }>({
      kind: "DRIFT",
      scope: "PATH",
      target: path,
    });

    if (
      signal &&
      signal.confidence >= 0.6 &&
      typeof signal.value?.drift_score === "number"
    ) {
      return signal.value.drift_score >= 0.3;
    }
    const q = `
      WITH recent AS (
        SELECT
          COUNT(*) AS total,
          AVG(confidence) AS avg_confidence,
          AVG(CASE WHEN verdict='APPROVE' THEN 1 ELSE 0 END) AS success_rate,
          SUM(CASE WHEN verifier_failed THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*),0) AS verifier_fail_rate
        FROM runtime_statistics
        WHERE path = $1
          AND created_at >= NOW() - INTERVAL '24 hours'
      ),
      baseline AS (
        SELECT
          COUNT(*) AS total,
          AVG(confidence) AS avg_confidence,
          AVG(CASE WHEN verdict='APPROVE' THEN 1 ELSE 0 END) AS success_rate,
          SUM(CASE WHEN verifier_failed THEN 1 ELSE 0 END)::float / NULLIF(COUNT(*),0) AS verifier_fail_rate
        FROM runtime_statistics
        WHERE path = $1
          AND created_at >= NOW() - INTERVAL '7 days'
          AND created_at < NOW() - INTERVAL '24 hours'
      )
      SELECT
        recent.avg_confidence AS r_conf,
        recent.success_rate AS r_success,
        recent.verifier_fail_rate AS r_verifier,
        baseline.avg_confidence AS b_conf,
        baseline.success_rate AS b_success,
        baseline.verifier_fail_rate AS b_verifier
      FROM recent, baseline
    `;

    const res = await pgPool.query(q, [path]);
    const row = res.rows[0];

    // 데이터 부족 → drift 없음
    if (!row || row.b_success === null) {
      return false;
    }

    const confidenceDrop =
      row.b_conf - row.r_conf > 0.15;

    const successDrop =
      row.b_success - row.r_success > 0.20;

    const verifierSpike =
      (row.r_verifier ?? 0) - (row.b_verifier ?? 0) > 0.15;

    return confidenceDrop || successDrop || verifierSpike;
  }
}
