// 🔒 PHASE 9-7 Vector Drift Detector
// - feature vector 변화 감지
// - 판단 ❌ / 적용 ❌

import { VectorRegistry } from "./vector/vector-registry";
import { VectorMetrics } from "./vector/vector-metrics";
import { SignalRegistry } from "./signal-registry";

const EUCLIDEAN_THRESHOLD = 0.35;
const COSINE_THRESHOLD = 0.75;

export class VectorDriftDetector {
  static detect(path: string) {
    const history = VectorRegistry.getHistory(path);
    if (history.length < 2) return;

    const prev = history[history.length - 2];
    const curr = history[history.length - 1];

    const dist = VectorMetrics.euclideanDistance(
      prev.values,
      curr.values
    );

    const cos = VectorMetrics.cosineSimilarity(
      prev.values,
      curr.values
    );

    if (
      dist >= EUCLIDEAN_THRESHOLD ||
      cos <= COSINE_THRESHOLD
    ) {
      SignalRegistry.emit({
        type: "DRIFT",
        path,
        score: Math.min(1, dist),
        meta: {
          euclidean: dist,
          cosine: cos,
        },
        detectedAt: Date.now(),
      });
    }
  }
}
