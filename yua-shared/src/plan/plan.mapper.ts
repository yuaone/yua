// yua-shared/plan/plan.mapper.ts

import type { Tier } from "../types/common";
import type { Plan } from "./plan.types";

export function tierToPlan(tier: Tier): Plan {
  switch (tier) {
    case "free":
      return "FREE";
    case "pro":
      return "PRO";
    case "business":
      return "BUSINESS";
    case "enterprise":
      return "ENTERPRISE";
    default:
      return "FREE";
  }
}
