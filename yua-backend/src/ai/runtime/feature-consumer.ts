// 🔒 PHASE 9-4 Feature Consumer (SSOT)
// - READ ONLY
// - Rule / Threshold / Mutation ❌

import type { RuntimeFeatureSnapshot } from "./feature-snapshot.types";

export class FeatureConsumer {
  /**
   * 🔍 Feature Snapshot 검증 (구조만)
   * - 값의 의미 판단 ❌
   */
  static validate(
    snapshot: RuntimeFeatureSnapshot
  ): boolean {
    if (!snapshot.path) return false;
    if (snapshot.windowHours <= 0) return false;
    if (snapshot.sampleSize < 0) return false;

    if (
      typeof snapshot.features !== "object" ||
      snapshot.features === null
    ) {
      return false;
    }

    // 모든 feature 값은 number 여야 함
    for (const v of Object.values(snapshot.features)) {
      if (typeof v !== "number" || Number.isNaN(v)) {
        return false;
      }
    }

    return true;
  }

  /**
   * 🔒 그대로 전달 (pass-through)
   */
  static consume(
    snapshot: RuntimeFeatureSnapshot
  ): RuntimeFeatureSnapshot {
    if (!this.validate(snapshot)) {
      throw new Error(
        "[FEATURE_SNAPSHOT_INVALID] schema mismatch"
      );
    }

    // 🔒 가공 / 변형 / 해석 ❌
    return snapshot;
  }
}
