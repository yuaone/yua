// 🔒 PHASE 9-7 Vector OOD Detector
// - centroid distance 기반

import { VectorRegistry } from "./vector/vector-registry";
import { VectorMetrics } from "./vector/vector-metrics";
import { SignalRegistry } from "./signal-registry";

const OOD_THRESHOLD = 0.6;

export class VectorOODDetector {
  static detect(path: string) {
    const history = VectorRegistry.getHistory(path);
    if (history.length < 4) return;

    const latest = history[history.length - 1];
    const vectors = history.slice(0, -1).map(v => v.values);

    const dim = latest.values.length;
    const center = new Array(dim).fill(0);

    for (const v of vectors) {
      for (let i = 0; i < dim; i++) {
        center[i] += v[i];
      }
    }

    for (let i = 0; i < dim; i++) {
      center[i] /= vectors.length;
    }

    const dist = VectorMetrics.euclideanDistance(
      latest.values,
      center
    );

    if (dist >= OOD_THRESHOLD) {
      SignalRegistry.emit({
        type: "OOD",
        path,
        score: Math.min(1, dist),
        meta: { centroidDistance: dist },
        detectedAt: Date.now(),
      });
    }
  }
}
