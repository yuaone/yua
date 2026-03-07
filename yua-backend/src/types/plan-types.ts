// 📂 src/types/plan-types.ts
// YUA ONE 전체 요금제 & 엔진 Tier 타입 통합

// DB에 저장되는 실제 플랜
export type PlanId =
  | "free"
  | "premium"
  | "developer"
  | "developer_pro"
  | "business"
  | "business_premium"
  | "enterprise"
  | "enterprise_team"
  | "enterprise_developer";

// 엔진 동작 기반 Tier
export type TierType = "free" | "pro" | "business" | "enterprise";

// Billing 정책에 사용
export interface BillingPolicy {
  maxDaily: number;
  maxMonthly: number;
  multiplier: number;
}
