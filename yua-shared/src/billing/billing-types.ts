// PlanId SSOT is in yua-backend/src/types/plan-types.ts (7+ consumers)
// TODO: migrate PlanId to yua-shared when backend imports are unified

export type SubscriptionStatus = "active" | "past_due" | "canceled" | "trialing" | "paused";

export interface Subscription {
  id: number;
  workspace_id: number;
  plan_id: string;
  status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string;
  cancel_at?: string | null;
  toss_subscription_id?: string | null;
  created_at: string;
}

export interface ApiCredit {
  id: number;
  api_key_id: number;
  workspace_id: number;
  balance: number;
  total_purchased: number;
  total_used: number;
  last_recharged_at?: string | null;
}

export type CreditTransactionType = "purchase" | "usage" | "refund" | "bonus";

export interface CreditTransaction {
  id: number;
  api_key_id: number;
  workspace_id: number;
  amount: number;
  type: CreditTransactionType;
  model?: string | null;
  description?: string | null;
  created_at: string;
}
