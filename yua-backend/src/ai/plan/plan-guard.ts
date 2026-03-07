// src/ai/plan/plan-guard.ts
// 🔒 PlanGuard — SSOT
// - 모든 project 관련 API는 여기 통과
// - throw ❌ (router에서 상태코드로만)

import {
  PLAN_ERROR,
  tierToPlan,
  canAccessProjects,
  canCreateProject,
} from "yua-shared";
import type { Tier } from "./workspace-plan.service";

export type PlanGuardResult =
  | { ok: true }
  | { ok: false; error: string };

export const PlanGuard = {
  assertProjectAccess(tier: Tier): PlanGuardResult {
    const plan = tierToPlan(tier);
    if (!canAccessProjects(plan)) {
      return { ok: false, error: PLAN_ERROR.PROJECT_NOT_ALLOWED };
    }
    return { ok: true };
  },

  assertProjectCreate(tier: Tier, currentProjectCount: number): PlanGuardResult {
    const plan = tierToPlan(tier);
    if (!canCreateProject(plan, currentProjectCount)) {
      return { ok: false, error: PLAN_ERROR.PROJECT_LIMIT_REACHED };
    }
    return { ok: true };
  },
    // ✅ Business/Enterprise에서만 팀 기능 허용
  assertTeamAccess(tier: Tier): PlanGuardResult {
    if (tier === "business" || tier === "enterprise") return { ok: true };
    return { ok: false, error: PLAN_ERROR.TEAM_NOT_ALLOWED };
  },
};
