// 🔒 PHASE 9-6 Vector Types (SSOT)

export type FeatureVector = {
  path: string;
  windowHours: number;
  sampleSize: number;

  /**
   * 🔒 고정 차원 벡터
   * - 순서 중요
   * - 값은 정규화된 number
   */
  values: number[];

  /**
   * feature key 순서 (디버그/해석용)
   */
  keys: string[];

  createdAt: number;
};
