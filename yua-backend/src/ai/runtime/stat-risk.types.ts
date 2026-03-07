// 🔒 PHASE 9-5 STAT Risk Types (SSOT)
// - 점수 프레임 정의 (판단/조치 ❌)

export type StatRiskFrame = {
  path: string;
  windowHours: number;
  sampleSize: number;

  // 0~1 (높을수록 위험, except confidenceNorm)
  confidenceNorm: number;   // 높을수록 "좋음"
  instabilityScore: number; // 높을수록 불안정
  failureScore: number;     // 높을수록 실패
  pathRiskScore: number;    // 최종 위험도(높을수록 위험)

  // 수치적 근거(투명성). 해석/판단은 금지.
  metrics: Record<string, number>;
};
