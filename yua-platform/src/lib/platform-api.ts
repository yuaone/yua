// platform-api.ts — API helper + mock data for yua-platform

import type { Subscription, CreditTransaction } from "yua-shared";

// Re-export shared billing types for convenience
export type { Subscription, ApiCredit, CreditTransaction, CreditTransactionType, SubscriptionStatus } from "yua-shared";

export interface ApiKey {
  id: number;
  name: string;
  key_prefix: string;
  key?: string; // full key — only available on creation
  status: "active" | "revoked";
  last_used_at: string | null;
  created_at: string;
  revoked_at: string | null;
}

export interface UsageRecord {
  date: string;
  model: string;
  calls: number;
  tokens: number;
  cost: number;
}

/** Credit balance response from GET /billing/v2/credits */
export interface CreditBalance {
  balance: number;
  total_purchased: number;
  total_used: number;
}

/** Transactions paginated response from GET /billing/v2/transactions */
export interface TransactionsResponse {
  data: CreditTransaction[];
  total: number;
  page: number;
  limit: number;
}

// Fetch wrapper (uses /api/* rewrite to backend)
export async function platformFetch<T = unknown>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { "Content-Type": "application/json", ...options?.headers },
    ...options,
  });
  if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
  return res.json();
}

/** @deprecated Dashboard still uses this — will be replaced with real API */
export const MOCK_API_KEYS: ApiKey[] = [
  { id: 1, name: "Production Server", key_prefix: "yua_sk_prod", status: "active", last_used_at: null, created_at: "2026-02-15T00:00:00Z", revoked_at: null },
  { id: 2, name: "Development", key_prefix: "yua_sk_dev_", status: "active", last_used_at: null, created_at: "2026-03-01T00:00:00Z", revoked_at: null },
  { id: 3, name: "Old Test Key", key_prefix: "yua_sk_test", status: "revoked", last_used_at: null, created_at: "2026-01-10T00:00:00Z", revoked_at: "2026-02-01T00:00:00Z" },
];

/* ── API Key CRUD ── */

export async function fetchApiKeys(): Promise<ApiKey[]> {
  const res = await platformFetch<{ ok: boolean; data: { keys: ApiKey[] } }>("/platform/keys");
  return res.data?.keys ?? [];
}

export async function createApiKey(name: string): Promise<ApiKey> {
  const res = await platformFetch<{ ok: boolean; data: ApiKey }>("/platform/keys", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
  return res.data!;
}

export async function revokeApiKey(id: number): Promise<void> {
  await platformFetch(`/platform/keys/${id}`, { method: "DELETE" });
}

export interface TestResult {
  response: string;
  model: string;
  latency: number;
  usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
  status: number;
}

export async function testApiCall(message: string, model: string): Promise<TestResult> {
  const res = await platformFetch<{ ok: boolean; data: TestResult }>("/platform/test", {
    method: "POST",
    body: JSON.stringify({ message, model }),
  });
  return res.data!;
}

/* ── Billing V2 API ── */

/** Fetch current credit balance */
export async function fetchCredits(): Promise<CreditBalance> {
  const res = await platformFetch<{ ok: boolean } & CreditBalance>("/billing/v2/credits");
  return { balance: res.balance, total_purchased: res.total_purchased, total_used: res.total_used };
}

/** Fetch current subscription */
export async function fetchSubscription(): Promise<Subscription | null> {
  const res = await platformFetch<{ ok: boolean; subscription: Subscription | null }>("/billing/v2/subscription");
  return res.subscription;
}

/** Fetch credit transactions (paginated) */
export async function fetchTransactions(page = 1, limit = 20): Promise<TransactionsResponse> {
  const res = await platformFetch<{ ok: boolean } & TransactionsResponse>(
    `/billing/v2/transactions?page=${page}&limit=${limit}`,
  );
  return { data: res.data, total: res.total, page: res.page, limit: res.limit };
}

/** Purchase credits via backend (requires paymentKey from Toss) */
export async function purchaseCredits(amount: number, paymentKey: string, orderId: string): Promise<{ balance: number }> {
  const res = await platformFetch<{ ok: boolean; balance: number }>("/billing/v2/purchase-credits", {
    method: "POST",
    body: JSON.stringify({ amount, paymentKey, orderId }),
  });
  return { balance: res.balance };
}

/** Subscribe or change plan */
export async function subscribePlan(planId: string, customerKey: string): Promise<Subscription> {
  const res = await platformFetch<{ ok: boolean; subscription: Subscription }>("/billing/v2/subscribe", {
    method: "POST",
    body: JSON.stringify({ planId, customerKey }),
  });
  return res.subscription;
}

/** Cancel subscription */
export async function cancelSubscription(subscriptionId: string): Promise<void> {
  await platformFetch("/billing/v2/cancel-subscription", {
    method: "POST",
    body: JSON.stringify({ subscriptionId }),
  });
}

/* ── Usage Analytics API ── */

export interface UsageDailyEntry {
  date: string;
  calls: number;
  credits: number;
}

export interface UsageByModelEntry {
  model: string;
  calls: number;
  credits: number;
}

export interface UsageTotal {
  calls: number;
  credits: number;
}

export interface UsageResponse {
  daily: UsageDailyEntry[];
  byModel: UsageByModelEntry[];
  total: UsageTotal;
  from: string;
  to: string;
}

/** Fetch usage analytics for a given number of days (default 30) */
export async function fetchUsage(days = 30): Promise<UsageResponse> {
  const res = await platformFetch<{ ok: boolean } & UsageResponse>(
    `/billing/v2/usage?days=${days}`,
  );
  return {
    daily: res.daily ?? [],
    byModel: res.byModel ?? [],
    total: res.total ?? { calls: 0, credits: 0 },
    from: res.from,
    to: res.to,
  };
}

export const MOCK_USAGE: UsageRecord[] = [
  { date: "2026-03-08", model: "yua-normal", calls: 1240, tokens: 520000, cost: 2.6 },
  { date: "2026-03-07", model: "yua-normal", calls: 980, tokens: 410000, cost: 2.05 },
  { date: "2026-03-07", model: "yua-deep", calls: 150, tokens: 890000, cost: 8.9 },
  { date: "2026-03-06", model: "yua-fast", calls: 3200, tokens: 640000, cost: 0.96 },
  { date: "2026-03-06", model: "yua-normal", calls: 870, tokens: 365000, cost: 1.83 },
  { date: "2026-03-05", model: "yua-normal", calls: 1100, tokens: 460000, cost: 2.3 },
  { date: "2026-03-05", model: "yua-deep", calls: 80, tokens: 520000, cost: 5.2 },
  { date: "2026-03-04", model: "yua-fast", calls: 2800, tokens: 560000, cost: 0.84 },
  { date: "2026-03-04", model: "yua-normal", calls: 760, tokens: 318000, cost: 1.59 },
  { date: "2026-03-03", model: "yua-search", calls: 200, tokens: 150000, cost: 1.5 },
];

/** @deprecated MOCK_PLAN — kept only for usage/dashboard pages not yet wired. Will be removed. */
export const MOCK_PLAN = {
  monthlyLimit: 100,
};

export const MOCK_DAILY_USAGE = [
  { date: "03/03", calls: 3050, cost: 12.4 },
  { date: "03/04", calls: 3560, cost: 2.43 },
  { date: "03/05", calls: 1180, cost: 7.5 },
  { date: "03/06", calls: 4070, cost: 2.79 },
  { date: "03/07", calls: 1130, cost: 10.95 },
  { date: "03/08", calls: 1240, cost: 2.6 },
];

export const MOCK_MODEL_BREAKDOWN = [
  { model: "yua-normal", calls: 4950, tokens: 2073000, cost: 10.37, pct: 42 },
  { model: "yua-fast", calls: 6000, tokens: 1200000, cost: 1.8, pct: 7 },
  { model: "yua-deep", calls: 230, tokens: 1410000, cost: 14.1, pct: 57 },
  { model: "yua-search", calls: 200, tokens: 150000, cost: 1.5, pct: 6 },
];
