// 🔒 PHASE 9-7 Vector Failure Clusterer

import { VectorRegistry } from "./vector/vector-registry";
import { VectorMetrics } from "./vector/vector-metrics";
import { SignalRegistry } from "./signal-registry";

const VECTOR_FAILURE_THRESHOLD = 0.5;

export class VectorFailureClusterer {
  static detect(path: string, failureCount: number) {
    if (failureCount < 3) return;

    const history = VectorRegistry.getHistory(path);
    if (history.length < 3) return;

    const a = history[history.length - 3].values;
    const b = history[history.length - 1].values;

    const dist = VectorMetrics.euclideanDistance(a, b);

    if (dist >= VECTOR_FAILURE_THRESHOLD) {
      SignalRegistry.emit({
        type: "FAILURE_CLUSTER",
        path,
        score: Math.min(1, dist),
        meta: {
          failureCount,
          vectorDistance: dist,
        },
        detectedAt: Date.now(),
      });
    }
  }
}
