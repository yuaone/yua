// 🔒 PHASE 9-7 Failure Clusterer
// - failure_surface_log 집계 결과 사용
// - cluster 감지만 수행

import { SignalRegistry } from "./signal-registry";

export type FailureClusterInput = {
  path: string;
  surfaceKey: string;
  count: number;
  windowHours: number;
};

const CLUSTER_THRESHOLD = 3;

export class FailureClusterer {
  static detect(input: FailureClusterInput) {
    const { path, surfaceKey, count, windowHours } = input;

    if (count < CLUSTER_THRESHOLD) return;

    const score = Math.min(1, count / (CLUSTER_THRESHOLD * 2));

    SignalRegistry.emit({
      type: "FAILURE_CLUSTER",
      path,
      score,
      meta: {
        surfaceKey,
        count,
        windowHours,
      },
      detectedAt: Date.now(),
    });
  }
}
