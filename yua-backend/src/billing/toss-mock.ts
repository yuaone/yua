/**
 * Mock Toss Payments client.
 * 실제 Toss SDK로 교체 시 이 파일만 대체하면 됩니다.
 * 모든 메서드는 동일한 인터페이스를 유지합니다.
 */
export const TossMock = {
  /** 결제 승인 (mock — 500ms delay) */
  async approvePayment(paymentKey: string, orderId: string, amount: number) {
    await new Promise((r) => setTimeout(r, 500));
    return {
      ok: true as const,
      paymentKey,
      orderId,
      totalAmount: amount,
      status: "DONE",
      approvedAt: new Date().toISOString(),
      method: "카드",
    };
  },

  /** 구독 생성 (mock — 500ms delay) */
  async createSubscription(customerKey: string, planId: string) {
    await new Promise((r) => setTimeout(r, 500));
    return {
      ok: true as const,
      subscriptionId: `sub_mock_${Date.now()}`,
      customerKey,
      planId,
      status: "active",
    };
  },

  /** 구독 취소 (mock — 300ms delay) */
  async cancelSubscription(subscriptionId: string) {
    await new Promise((r) => setTimeout(r, 300));
    return {
      ok: true as const,
      subscriptionId,
      status: "canceled",
    };
  },

  /** 환불 (mock — 500ms delay) */
  async refund(paymentKey: string, reason: string) {
    await new Promise((r) => setTimeout(r, 500));
    return {
      ok: true as const,
      paymentKey,
      status: "refunded",
      reason,
    };
  },
};
