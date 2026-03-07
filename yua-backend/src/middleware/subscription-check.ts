import { Response, NextFunction } from "express";
import { db } from "../db/mysql";
import { InstanceAuthedRequest } from "./instance-access-middleware";

type PlanType = "free" | "pro" | "business" | "enterprise";

export async function requirePlanLimit(
  req: InstanceAuthedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ ok: false, error: "unauthorized" });
    }

    const [[userRow]]: any = await db.query(
      `SELECT plan_id FROM users WHERE id = ? LIMIT 1`,
      [user.userId]
    );

    const plan: PlanType = userRow?.plan_id ?? "free";

    const [[cnt]]: any = await db.query(
      `SELECT COUNT(*) AS cnt FROM engine_instances WHERE user_id = ?`,
      [user.userId]
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
      });
    }

    next();
  } catch (err) {
    console.error("Plan Limit Error:", err);
    return res.status(500).json({ ok: false });
  }
}
