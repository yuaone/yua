// 📂 src/ai/signal-generators/runtime-signal-to-confidence-trend.ts
// 🔥 Runtime Signal → CONFIDENCE_TREND Generator (SSOT FINAL)
// -----------------------------------------------------------
// ✔ deterministic
// ✔ postgres only
// ✔ write-only
// ✔ explainable

import { pgPool } from "../../db/postgres";
import { RuntimeSignalResolver } from "../statistics/runtime-signal-resolver";

/* --------------------------------------------------
 * SSOT Constants
 * -------------------------------------------------- */

const WINDOW_HOURS = 24;
const DROP_THRESHOLD = 0.12;
const MIN_SAMPLE_SIZE = 50;

/* --------------------------------------------------
 * Generator
 * -------------------------------------------------- */

export async function generateConfidenceTrendSignals(): Promise<void> {
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

    if (frame.avgConfidence >= 0.6) continue;

    const confidenceDrop = 0.6 - frame.avgConfidence;
    if (confidenceDrop < DROP_THRESHOLD) continue;

    const value = {
      path: frame.path,
      avgConfidence: frame.avgConfidence,
      dropFromBaseline: confidenceDrop,
      sampleSize: frame.sampleSize,
    };

    const confidence = computeSignalConfidence({
      sampleSize: frame.sampleSize,
      severity: confidenceDrop,
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
        'CONFIDENCE_TREND', 'PATH', $1,
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
 * Confidence Formula (SSOT)
 * -------------------------------------------------- */

function computeSignalConfidence(args: {
  sampleSize: number;
  severity: number;
}): number {
  const sizeScore = Math.min(1, args.sampleSize / 300);
  const severityScore = Math.min(1, args.severity / 0.3);

  return clamp(
    sizeScore * 0.5 + severityScore * 0.5,
    0,
    1
  );
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}
