// src/ai/engines/adaptive-router.ts
// 🔒 PHASE 7.9 Adaptive Router (SSOT)

import { CalibrationEngine } from "../statistics/calibration-engine";
import { DriftDetector } from "../statistics/drift-detector";

/**
 * AdaptiveRouter
 *
 * 책임:
 * - confidence 보정 + drift 반영
 *
 * 금지:
 * - engine 선택 ❌
 * - path 변경 ❌
 */
export class AdaptiveRouter {
  static async adjust(params: {
    path: string;
    confidence: number;
  }): Promise<{
    confidence: number;
    drifted: boolean;
  }> {
    const { path, confidence } = params;

    // 1️⃣ Calibration (실측 기반)
    const calibrated =
      await CalibrationEngine.calibrate(confidence);

    // 2️⃣ Drift 감지
    const drifted =
      await DriftDetector.hasDrift(path);

    // 3️⃣ Drift 발생 시 보수적 캡
    const adjustedConfidence = drifted
      ? Math.min(calibrated, 0.6)
      : calibrated;

    return {
      confidence: adjustedConfidence,
      drifted,
    };
  }
}
