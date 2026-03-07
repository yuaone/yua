// 📂 src/ai/signal-generators/runtime-signal-to-path-bias.ts
// 🔥 Runtime Signal → PATH_BIAS Generator (SSOT FINAL)
// ----------------------------------------------------
// ✔ deterministic
// ✔ postgres only
// ✔ write-only (signal_library)
// ✔ runtime-safe
// ✔ explainable bias only

import { pgPool } from "../../db/postgres";
import type { FlowAnchor } from "../reasoning/reasoning-engine";
import { RuntimeSignalResolver } from "../statistics/runtime-signal-resolver";

/* --------------------------------------------------
 * SSOT Constants
 * -------------------------------------------------- */

const WINDOW_HOURS = 24;
const MIN_SAMPLE_SIZE = 40;
const MAX_BIAS = 0.15;

/**
 * neutral 기준선
 * - verdictHoldRate: 0.15
 * - verifierFailureRate: 0.1
 */
const BASELINE = {
  hold: 0.15,
  verifier: 0.1,
};

/* --------------------------------------------------
 * Bias 계산 함수 (SSOT)
 * -------------------------------------------------- */

function computeBias(frame: {
  verdictHoldRate: number;
  verifierFailureRate: number;
}): number {
  let bias = 0;

  // HOLD 과다 → 흐름 과도 (bias ↓)
  bias -= (frame.verdictHoldRate - BASELINE.hold) * 0.5;

  // verifier 실패 과다 → 위험 (bias ↓)
  bias -= (frame.verifierFailureRate - BASELINE.verifier) * 0.7;

  return clamp(bias, -MAX_BIAS, MAX_BIAS);
}

/* --------------------------------------------------
 * Generator
 * -------------------------------------------------- */

export async function generatePathBiasSignals(): Promise<void> {
  const frames =
    await RuntimeSignalResolver.resolveAll({
      lastHours: WINDOW_HOURS,
    });

  const now = new Date();
  const windowFrom = new Date(
    now.getTime() - WINDOW_HOURS * 3600 * 1000
  );

  for (const frame of frames) {
    if (frame.sampleSize < MIN_SAMPLE_SIZE) continue;

    const bias = computeBias(frame);
    if (Math.abs(bias) < 0.02) continue; // 🔒 noise cut

    const value = {
      path: frame.path,
      anchorWeight: {
        NEXT_STEP: bias,
      } satisfies Partial<Record<FlowAnchor, number>>,
      metrics: {
        verdictHoldRate: frame.verdictHoldRate,
        verifierFailureRate: frame.verifierFailureRate,
        sampleSize: frame.sampleSize,
      },
    };

    const confidence = computeSignalConfidence({
      sampleSize: frame.sampleSize,
      volatility: Math.abs(bias),
    });

    await pgPool.query(
      `
      INSERT INTO signal_library (
        kind, scope, target,
        value, confidence,
        window_from, window_to,
        generated_by
      )
      VALUES (
        'PATH_BIAS', 'PATH', $1,
        $2::jsonb, $3,
        $4, $5,
        'STAT_RULE'
      )
      `,
      [
        frame.path,
        JSON.stringify(value),
        confidence,
        windowFrom,
        now,
      ]
    );
  }
}

/* --------------------------------------------------
 * Utilities
 * -------------------------------------------------- */

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function computeSignalConfidence(args: {
  sampleSize: number;
  volatility: number;
}): number {
  const sizeScore = Math.min(1, args.sampleSize / 200);
  const stability = 1 - Math.min(1, args.volatility / MAX_BIAS);

  return clamp(
    sizeScore * 0.6 + stability * 0.4,
    0,
    1
  );
}
