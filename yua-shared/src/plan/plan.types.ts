// yua-shared/plan/plan.types.ts

export type Plan = "FREE" | "PRO" | "BUSINESS" | "ENTERPRISE";

export type PlanLimits = {
  maxProjects: number | "UNLIMITED";
};

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  FREE: {
    maxProjects: 1,
  },
  PRO: {
    maxProjects: 3,
  },
  BUSINESS: {
    maxProjects: "UNLIMITED",
  },
  ENTERPRISE: {
    maxProjects: "UNLIMITED",
  },
};
