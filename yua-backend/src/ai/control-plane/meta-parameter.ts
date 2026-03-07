// 🔥 Meta Parameter — v4 Control Plane Core
// 학습 결과는 "판단"이 아니라 "조정치"만 낸다 (SSOT)

export type MetaParameter = {
  id: string;
  target:
    | "RULE_CONFIDENCE"
    | "THRESHOLD"
    | "RISK_WEIGHT"
    | "CONTINUATION_WEIGHT"
    | "DRIFT_WEIGHT"
    | "BOOST_CAP";
  scope: "GLOBAL" | "DOMAIN" | "PATH";
  key: string;
  delta: number;
  confidence: number;
  createdAt: number;
  ttlMs?: number; // 🔥 v2 TTL 추가
};