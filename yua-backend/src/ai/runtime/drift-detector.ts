// 🔒 PHASE 9-7 Drift Detector
// - slope / volatility 기반 변화 감지
// - 판단 ❌ / 적용 ❌

import { SignalRegistry } from "./signal-registry";

export type DriftInput = {
  path: string;
  confidenceSlope: number;      // 음수면 하락
  confidenceVolatility: number; // 흔들림
};

const SLOPE_THRESHOLD = -0.05;
const VOLATILITY_THRESHOLD = 0.18;

export class DriftDetector {
  static detect(input: DriftInput) {
    const { path, confidenceSlope, confidenceVolatility } = input;

    let score = 0;

    if (confidenceSlope <= SLOPE_THRESHOLD) {
      score += Math.abs(confidenceSlope) * 2;
    }

    if (confidenceVolatility >= VOLATILITY_THRESHOLD) {
      score += confidenceVolatility;
    }

    if (score <= 0) return;

    SignalRegistry.emit({
      type: "DRIFT",
      path,
      score: Math.min(1, score),
      meta: {
        confidenceSlope,
        confidenceVolatility,
      },
      detectedAt: Date.now(),
    });
  }
}
