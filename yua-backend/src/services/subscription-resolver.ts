import type { Subscription } from "../db/repositories/subscription-repo";

type PlanType = "free" | "pro" | "business" | "enterprise";

type ResolveResult = {
  plan: PlanType;
  isTrial: boolean;
};

function normalizePlan(raw?: string | null): PlanType {
  const v = String(raw ?? "free").toLowerCase();
  if (v.includes("enterprise")) return "enterprise";
  if (v.includes("business")) return "business";
  if (v.includes("pro") || v.includes("premium")) return "pro";
  return "free";
}

export function resolveEffectivePlan(sub: Subscription | null): ResolveResult {
  if (!sub) return { plan: "free", isTrial: false };

  const status = String(sub.status ?? "").toLowerCase();
  if (status === "trial") {
    return { plan: normalizePlan(sub.plan), isTrial: true };
  }
  if (status !== "active") {
    return { plan: "free", isTrial: false };
  }

  return { plan: normalizePlan(sub.plan), isTrial: false };
}
