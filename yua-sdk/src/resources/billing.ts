import type { APIClient } from "../core/api-client";

export interface CreditBalance {
  balance: number;
  total_purchased: number;
  total_used: number;
}

export interface CreditPurchaseParams {
  amount: number;
  paymentKey: string;
  orderId: string;
}

export interface CreditPurchaseResult {
  balance: number;
  transaction: {
    id: number;
    amount: number;
    type: string;
    description: string;
    created_at: string;
  };
}

export interface Subscription {
  id: number;
  workspace_id: number;
  plan_id: string;
  status: string;
  toss_subscription_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at: string | null;
  created_at: string;
}

export interface SubscribeParams {
  planId: string;
  customerKey: string;
}

export interface CancelSubscriptionParams {
  subscriptionId: string;
}

export interface Transaction {
  id: number;
  amount: number;
  type: string;
  description: string;
  created_at: string;
}

export interface TransactionListParams {
  page?: number;
  limit?: number;
}

export class Billing {
  private readonly client: APIClient;

  constructor(client: APIClient) {
    this.client = client;
  }

  async getCredits(): Promise<CreditBalance> {
    const res = await this.client.get<{ ok: boolean } & CreditBalance>(
      "/api/billing/v2/credits"
    );
    return {
      balance: res.balance,
      total_purchased: res.total_purchased,
      total_used: res.total_used,
    };
  }

  async purchaseCredits(params: CreditPurchaseParams): Promise<CreditPurchaseResult> {
    const res = await this.client.post<{
      ok: boolean;
      balance: number;
      transaction: CreditPurchaseResult["transaction"];
    }>("/api/billing/v2/purchase-credits", params);
    return { balance: res.balance, transaction: res.transaction };
  }

  async getSubscription(): Promise<Subscription | null> {
    const res = await this.client.get<{ ok: boolean; subscription: Subscription | null }>(
      "/api/billing/v2/subscription"
    );
    return res.subscription;
  }

  async subscribe(params: SubscribeParams): Promise<Subscription> {
    const res = await this.client.post<{ ok: boolean; subscription: Subscription }>(
      "/api/billing/v2/subscribe",
      params
    );
    return res.subscription;
  }

  async cancelSubscription(params: CancelSubscriptionParams): Promise<{ ok: boolean }> {
    return this.client.post<{ ok: boolean }>(
      "/api/billing/v2/cancel-subscription",
      params
    );
  }

  async listTransactions(params?: TransactionListParams): Promise<{
    transactions: Transaction[];
    total: number;
  }> {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));

    const qs = query.toString();
    const path = `/api/billing/v2/transactions${qs ? `?${qs}` : ""}`;

    const res = await this.client.get<{
      ok: boolean;
      data: Transaction[];
      total: number;
    }>(path);
    return { transactions: res.data, total: res.total };
  }
}
