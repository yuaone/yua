// 🔒 PHASE 9-5 STAT Risk Model (SSOT)
// - FeatureSnapshot → StatRiskFrame (점수 계산만)
// - Rule/Threshold/Mutation/Path 변경 ❌

import type { RuntimeFeatureSnapshot } from "./feature-snapshot.types";
import type { StatRiskFrame } from "./stat-risk.types";

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

function safeNum(v: unknown, fallback = 0): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export type StatRiskModelConfig = {
  slopeScale: number;   // default 0.15
  volScale: number;     // default 0.20
  densityScale: number; // default 0.25
  sampleScale: number;  // default 200

  wSlope: number; // default 0.55
  wVol: number;   // default 0.45

  a: number; // confidenceLow weight (default 0.45)
  b: number; // instability weight (default 0.30)
  c: number; // failure weight (default 0.25)
};

export const DEFAULT_STAT_RISK_CONFIG: StatRiskModelConfig = {
  slopeScale: 0.15,
  volScale: 0.20,
  densityScale: 0.25,
  sampleScale: 200,

  wSlope: 0.55,
  wVol: 0.45,

  a: 0.45,
  b: 0.30,
  c: 0.25,
};

export class StatRiskModel {
  static compute(
    snap: RuntimeFeatureSnapshot,
    cfg: StatRiskModelConfig = DEFAULT_STAT_RISK_CONFIG
  ): StatRiskFrame {
    const f = snap.features ?? {};

    const confidenceMean = clamp01(safeNum(f["confidence_mean"], 0));
    const confidenceSlope = safeNum(f["confidence_slope"], 0); // can be negative
    const confidenceVol = Math.max(0, safeNum(f["confidence_volatility"], 0));

    const failureDensity = Math.max(0, safeNum(f["failure_density"], 0));
    const toolFailStreak = Math.max(0, safeNum(f["tool_fail_streak"], 0));

    const confidenceNorm = confidenceMean;
    const confidenceLow = clamp01(1 - confidenceNorm);

    const slopeDown = clamp01(Math.max(0, -confidenceSlope) / cfg.slopeScale);
    const volNorm = clamp01(confidenceVol / cfg.volScale);

    const instabilityScore = clamp01(cfg.wSlope * slopeDown + cfg.wVol * volNorm);

    const densityNorm = clamp01(failureDensity / cfg.densityScale);
    const streakNorm = clamp01(Math.max(0, toolFailStreak - 2) / 6);

    const failureScore = clamp01(0.7 * densityNorm + 0.3 * streakNorm);

    const raw = cfg.a * confidenceLow + cfg.b * instabilityScore + cfg.c * failureScore;
    const rawClamped = clamp01(raw);

    // sampleSize damping (avoid overreacting to tiny samples)
    const sampleSize = Math.max(0, snap.sampleSize ?? 0);
    const sampleFactor = clamp01(
      Math.log1p(sampleSize) / Math.log1p(cfg.sampleScale)
    );

    const pathRiskScore = clamp01(rawClamped * (0.6 + 0.4 * sampleFactor));

    return {
      path: snap.path,
      windowHours: snap.windowHours,
      sampleSize,

      confidenceNorm,
      instabilityScore,
      failureScore,
      pathRiskScore,

      metrics: {
        confidence_mean: confidenceMean,
        confidence_slope: confidenceSlope,
        confidence_volatility: confidenceVol,

        confidence_low: confidenceLow,
        slope_down: slopeDown,
        vol_norm: volNorm,

        failure_density: failureDensity,
        density_norm: densityNorm,
        tool_fail_streak: toolFailStreak,
        streak_norm: streakNorm,

        raw_risk: raw,
        raw_risk_clamped: rawClamped,
        sample_factor: sampleFactor,
      },
    };
  }
}
