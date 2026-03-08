export type Tier = "free" | "pro" | "business" | "enterprise";

export type AuthFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export async function billingCreate(
  authFetch: AuthFetch,
  payload: { user_id: string; plan: Tier; amount: number }
): Promise<{ orderId: string }> {
  const res = await authFetch("/api/billing/create", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || "billing_create_failed");
  }
  return { orderId: String(data.orderId) };
}

export async function billingConfirm(
  authFetch: AuthFetch,
  payload: { user_id: string; plan: Tier; amount: number; orderId: string; paymentKey: string }
): Promise<void> {
  const res = await authFetch("/api/billing/confirm", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || "billing_confirm_failed");
  }
}

export async function billingMockUpgrade(
  authFetch: AuthFetch,
  payload: { user_id: string; plan: Tier; amount: number }
): Promise<void> {
  const { orderId } = await billingCreate(authFetch, payload);
  const paymentKey = `MOCK_${orderId}`;
  await billingConfirm(authFetch, { ...payload, orderId, paymentKey });
}

export async function scheduleDowngrade(
  authFetch: AuthFetch,
  targetPlan: "free" | "pro" | "business"
): Promise<any> {
  const res = await authFetch("/api/billing/schedule-downgrade", {
    method: "POST",
    body: JSON.stringify({ targetPlan }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || "schedule_downgrade_failed");
  }
  return data;
}

export async function cancelDowngrade(authFetch: AuthFetch): Promise<any> {
  const res = await authFetch("/api/billing/cancel-downgrade", {
    method: "POST",
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || "cancel_downgrade_failed");
  }
  return data;
}
