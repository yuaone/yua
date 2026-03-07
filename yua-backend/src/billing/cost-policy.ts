// 📂 src/billing/cost-policy.ts
// 🔥 YUA ONE Billing Policy — Master Final

import { TierType } from "../types/tier-types";

export interface EngineCostTable {
  base: number;
  perToken?: number;
  perCycle?: number;
}

export const ENGINE_COST: Record<string, EngineCostTable> = {
  gen59:       { base: 0.3,  perToken: 0.0001 },
  "hpe-lite":  { base: 0.5,  perToken: 0.00015 },
  hpe7:        { base: 1.0,  perToken: 0.00025 },
  "omega-lite":{ base: 0.2 },
  stability:   { base: 0.05 },
  memory:      { base: 0.03 },
  "quantum-v2":{ base: 5.0,  perCycle: 0.002 },
};

// ⭐ TierType은 central type 기준
export const TIER_MULTIPLIER: Record<TierType, number> = {
  free: 1.0,
  pro: 1.2,
  business: 1.5,
  enterprise: 2.5,
};

// 엔진 조합 기반 비용 추정
export function engineCostEstimate(engines: string[], tier: TierType): number {
  const multiplier = TIER_MULTIPLIER[tier];
  let total = 0;

  for (const e of engines) {
    const table = ENGINE_COST[e];
    if (!table) continue;
    total += table.base;
  }

  return Number((total * multiplier).toFixed(4));
}
