// 📂 src/types/plan-map.ts

import { PlanId, TierType } from "./plan-types";

export const PLAN_MAP: Record<PlanId, TierType> = {
  free: "free",

  premium: "pro",
  developer: "pro",
  developer_pro: "pro",

  business: "business",
  business_premium: "business",

  enterprise: "enterprise",
  enterprise_team: "enterprise",
  enterprise_developer: "enterprise",
};
