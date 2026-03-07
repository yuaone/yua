// 🔒 PHASE 9-4 Runtime Feature Snapshot Types (SSOT)
// - PY → TS 계약 단일 진실원본
// - 판단 / 계산 ❌

export type RuntimeFeatureSnapshot = {
  path: string;
  windowHours: number;
  sampleSize: number;

  /**
   * 🔒 Feature Vector
   * - 모든 값은 number
   * - 의미 해석은 TS (9-5 이후)에서만
   */
  features: Record<string, number>;
};
