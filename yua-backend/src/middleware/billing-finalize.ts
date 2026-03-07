import { Request, Response, NextFunction } from "express";
import { calculateBilling } from "../billing/billing-engine";
import { PLAN_MAP } from "../types/plan-map";
import { TierType, PlanId } from "../types/plan-types";
import { SubscriptionRepo } from "../db/repositories/subscription-repo";
import { pool } from "../db/mysql";

export async function billingFinalize(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { enginePlan, estimatedCostUnit } = req.body.billingBootstrap;
    const userId = (req as any)?.user?.userId as string | undefined;
    if (!userId) {
      return res.status(401).json({ error: "unauthorized" });
    }
    const sub = await SubscriptionRepo.getByUserId(userId);
    const plan = (sub?.plan ?? "free") as PlanId;

    const instanceId: string | undefined = req.body.instanceId;
    if (!instanceId) {
      return res.status(400).json({ error: "instanceId missing for billing" });
    }

    // 🔁 Plan → Tier
    const tier: TierType = PLAN_MAP[plan as PlanId] ?? "free";

    const spineResult = res.locals.spineResult ?? {};

    // 🔥 Billing 계산 (DB 기록용)
    const billing = calculateBilling({
      instanceId,
      tier,
      engines: enginePlan.engines,
      tokenIn: spineResult.tokenIn ?? 0,
      tokenOut: spineResult.tokenOut ?? 0,
      quantumCycles: spineResult.quantumCycles ?? 0,
    });

    const tokenIn = spineResult.tokenIn ?? 0;
    const tokenOut = spineResult.tokenOut ?? 0;
    const totalTokens = tokenIn + tokenOut;
    const costUnit = billing.actual ?? estimatedCostUnit ?? 0;
    const imageUsed =
      req.body?.image === true ||
      req.body?.imageUsed === true ||
      req.body?.isImage === true ||
      (typeof req.body?.imageCount === "number" && req.body.imageCount > 0) ||
      (Array.isArray(req.body?.attachments) &&
        req.body.attachments.some((a: any) => a?.kind === "image"));
    const imageInc = imageUsed ? 1 : 0;

    await pool.query(
      `INSERT INTO yua_usage_daily
        (user_id, date, calls, image_calls, total_tokens, cost_unit)
       VALUES (?, CURDATE(), 0, 0, ?, ?)
       ON DUPLICATE KEY UPDATE
         total_tokens = COALESCE(total_tokens, 0) + ?,
         cost_unit = COALESCE(cost_unit, 0) + ?`,
      [userId, totalTokens, costUnit, totalTokens, costUnit]
    );

    await pool.query(
      `INSERT INTO yua_usage_monthly
        (user_id, year, month, calls, total_tokens, cost_unit)
       VALUES (?, YEAR(CURDATE()), MONTH(CURDATE()), 0, ?, ?)
       ON DUPLICATE KEY UPDATE
         total_tokens = COALESCE(total_tokens, 0) + ?,
         cost_unit = COALESCE(cost_unit, 0) + ?`,
      [userId, totalTokens, costUnit, totalTokens, costUnit]
    );

    // 다음 미들웨어 / 컨트롤러에서 사용
    res.locals.billing = {
      estimated: estimatedCostUnit,
      actual: billing.actual,
      breakdown: billing.breakdown,
    };

    return next();
  } catch (err) {
    console.error("billing-finalize error:", err);
    return res.status(500).json({
      error: "billing_finalize_failed",
      message: (err as Error).message,
    });
  }
}
