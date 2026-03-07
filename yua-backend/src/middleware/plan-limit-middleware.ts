// 📂 src/middleware/plan-limit-middleware.ts

import { Response, NextFunction } from "express";
import { db } from "../db/mysql";
import type { Request } from "express";
import { SubscriptionRepo } from "../db/repositories/subscription-repo";

type PlanType = "free" | "pro" | "business" | "enterprise";

type AuthedRequest = Request & {
  user?: {
    userId: string;
  };
};

function normalizePlan(plan?: string): PlanType {
  if (plan === "pro" || plan === "business" || plan === "enterprise") {
    return plan;
  }
  return "free";
}

export async function requirePlanLimit(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    if (!req.user?.userId) {
      return res.status(401).json({ ok: false, error: "unauthorized" });
    }

    const subscription = await SubscriptionRepo.getByUserId(
      req.user.userId
    );
    const plan: PlanType = normalizePlan(subscription?.plan);

    const [[cnt]]: any = await db.query(
      `SELECT COUNT(*) AS cnt FROM engine_instances WHERE user_id = ?`,
      [req.user.userId]
    );

    const maxInstances: Record<PlanType, number> = {
      free: 1,
      pro: 3,
      business: 10,
      enterprise: 999,
    };

    if (cnt.cnt >= maxInstances[plan]) {
      return res.status(403).json({
        ok: false,
        error: "plan_limit_exceeded",
        message: "Instance limit exceeded for your plan",
      });
    }

    next();
  } catch (err) {
    console.error("Plan Limit Error:", err);
    return res.status(500).json({ ok: false, error: "plan_limit_error" });
  }
}
