// 📂 src/middleware/billing-bootstrap.ts
// 🔥 Billing Bootstrap: EstimatedCost + EnginePlan 준비

import { Request, Response, NextFunction } from "express";
import { pickEnginePlan } from "../ai/utils/pick-model";
import { engineCostEstimate } from "../billing/cost-policy";

export function billingBootstrap(req: Request, res: Response, next: NextFunction) {
  try {
    const type = req.body.type;
    const query = req.body.query;

    const plan = pickEnginePlan(type);

    const estimated = engineCostEstimate(plan.engines, plan.tier);

    req.body.billingBootstrap = {
      enginePlan: plan,
      estimatedCostUnit: estimated,
    };

    return next();
  } catch (err: any) {
    console.error("billing-bootstrap error:", err);
    return res.status(500).json({
      error: "billing_bootstrap_failed",
      message: err.message,
    });
  }
}
