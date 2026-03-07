// 🔒 PHASE 9-6 Feature Vectorizer (SSOT)
// - 판단 ❌
// - 학습 ❌
// - 순수 변환

import type { RuntimeFeatureSnapshot } from "../feature-snapshot.types";
import type { FeatureVector } from "./vector-types";

/**
 * 🔒 Feature → Vector 변환
 * - key 알파벳 정렬로 차원 고정
 * - 값은 그대로 (정규화는 9-5/9-7에서)
 */
export class FeatureVectorizer {
  static vectorize(
    snapshot: RuntimeFeatureSnapshot
  ): FeatureVector {
    const keys = Object.keys(snapshot.features).sort();
    const values = keys.map(k => snapshot.features[k]);

    return {
      path: snapshot.path,
      windowHours: snapshot.windowHours,
      sampleSize: snapshot.sampleSize,
      keys,
      values,
      createdAt: Date.now(),
    };
  }
}
