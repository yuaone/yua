// 🔒 PHASE 9-7 OOD Detector
// - 분포 이탈 감지 (통계 기반)
// - 적용 ❌ / 차단 ❌

import { SignalRegistry } from "./signal-registry";

export type OODInput = {
  path: string;
  baselineMean: number;
  baselineStd: number;
  currentMean: number;
};

const Z_THRESHOLD = 2.5;

export class OODDetector {
  static detect(input: OODInput) {
    const { path, baselineMean, baselineStd, currentMean } = input;

    if (baselineStd <= 0) return;

    const z =
      Math.abs(currentMean - baselineMean) / baselineStd;

    if (z < Z_THRESHOLD) return;

    const score = Math.min(1, z / 4);

    SignalRegistry.emit({
      type: "OOD",
      path,
      score,
      meta: {
        baselineMean,
        baselineStd,
        currentMean,
        zScore: z,
      },
      detectedAt: Date.now(),
    });
  }
}
