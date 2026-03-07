// yua-shared/plan/plan.policy.ts

import { Plan, PLAN_LIMITS } from "./plan.types";

export function canCreateProject(
  plan: Plan,
  currentProjectCount: number
): boolean {
  const limit = PLAN_LIMITS[plan].maxProjects;
  if (limit === "UNLIMITED") return true;
  return currentProjectCount < limit;
}

export function canAccessProjects(plan: Plan): boolean {
  return PLAN_LIMITS[plan].maxProjects !== 0;
}
