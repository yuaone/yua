import { PlanId, BillingPolicy } from "../types/plan-types";

export const BILLING_POLICY: Record<PlanId, BillingPolicy> = {
  free: { maxDaily: 500, maxMonthly: 1000, multiplier: 1.0 },

  premium: { maxDaily: 5000, maxMonthly: 20000, multiplier: 1.2 },
  developer: { maxDaily: 5000, maxMonthly: 20000, multiplier: 1.2 },
  developer_pro: { maxDaily: 10000, maxMonthly: 40000, multiplier: 1.2 },

  business: { maxDaily: 20000, maxMonthly: 100000, multiplier: 1.5 },
  business_premium: { maxDaily: 30000, maxMonthly: 150000, multiplier: 1.5 },

  enterprise: { maxDaily: Infinity, maxMonthly: Infinity, multiplier: 2.0 },
  enterprise_team: { maxDaily: Infinity, maxMonthly: Infinity, multiplier: 2.0 },
  enterprise_developer: { maxDaily: Infinity, maxMonthly: Infinity, multiplier: 2.0 },
};
