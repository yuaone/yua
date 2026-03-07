// 📂 src/billing/billing-engine.ts
import { ENGINE_COST, TIER_MULTIPLIER } from "./cost-policy";
import { TierType } from "../types/plan-types";

export interface BillingInput {
  instanceId: string;
  tier: TierType;
  engines: string[];
  tokenIn: number;
  tokenOut: number;
  quantumCycles: number;
}

export interface BillingResult {
  instanceId: string;
  estimated: number;
  actual: number;
  breakdown: Record<string, number>;
}

export function calculateBilling(input: BillingInput): BillingResult {
  const { instanceId, tier, engines, tokenIn, tokenOut, quantumCycles } = input;

  if (!instanceId) {
    throw new Error("❌ instanceId is required for billing");
  }

  const multiplier = TIER_MULTIPLIER[tier];
  const breakdown: Record<string, number> = {};
  let total = 0;

  for (const e of engines) {
    const table = ENGINE_COST[e];
    if (!table) continue;

    let cost = table.base;

    if (table.perToken) {
      cost += (tokenIn + tokenOut) * table.perToken;
    }

    if (table.perCycle) {
      cost += quantumCycles * table.perCycle;
    }

    cost = cost * multiplier;

    breakdown[e] = Number(cost.toFixed(4));
    total += cost;
  }

  return {
    instanceId,
    estimated: 0,
    actual: Number(total.toFixed(4)),
    breakdown,
  };
}
