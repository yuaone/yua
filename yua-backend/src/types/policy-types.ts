// 📂 src/types/policy-types.ts
// =====================================================
//  YUA ONE — Policy Types (SSOT)
// =====================================================

import type { TierType } from "./tier-types";

export type UserRole =
  | "guest"
  | "individual"
  | "developer"
  | "business"
  | "enterprise"
  | "superadmin";

export type EngineRouteType =
  | "chat"
  | "chat-stream"
  | "spine-stream"
  | "report"
  | "risk"
  | "pattern"
  | "trade"
  | "math"
  | "calc";

export interface PolicyContext {
  // ✅ Instance scope (STEP 6 핵심)
  instanceId?: string;

  // ✅ API / Auth scope
  apiKey?: string;
  userId?: string;
  userRole?: UserRole;

  // ✅ Billing tier scope
  tier?: TierType;

  // ✅ Request scope
  routeType?: EngineRouteType | string;
  ip?: string;

  // ✅ Extra metadata
  meta?: Record<string, unknown>;
}

export interface PolicyDecision {
  ok: boolean;
  warning?: string;

  // “왜 막혔는지” 추적용
  code?: string;
  source?: "policy";
}
