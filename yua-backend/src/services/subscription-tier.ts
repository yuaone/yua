export const TIER_PRIORITY: Record<string, number> = {
  free: 0,
  pro: 1,
  business: 2,
  enterprise: 3,
};

export function planToTier(plan: string): string {
  const p = (plan || "").toLowerCase();
  if (p.includes("enterprise")) return "enterprise";
  if (p.includes("business")) return "business";
  if (p.includes("pro") || p.includes("premium") || p.includes("developer")) return "pro";
  return "free";
}
