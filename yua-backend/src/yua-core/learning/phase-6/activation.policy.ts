// 🔒 YUA SSOT — Controlled Activation Policy (PHASE 6)

import { ActivationMode } from "./activation.types";

interface ActivationContext {
  approved: boolean;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  confidenceImpact?: number;
}

export function decideActivationMode(
  ctx: ActivationContext
): ActivationMode {
  if (!ctx.approved) return "SHADOW";

  if (ctx.severity === "CRITICAL") {
    return "SHADOW";
  }

  if ((ctx.confidenceImpact ?? 0) < -0.2) {
    return "LIMITED";
  }

  return "FULL";
}
