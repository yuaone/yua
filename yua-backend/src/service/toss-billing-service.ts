import axios from "axios";

const TOSS_SECRET = process.env.TOSS_SECRET_KEY || "";
const TOSS_API_URL = "https://api.tosspayments.com/v1/payments";

/**
 * 🔵 Toss Billing Service
 * - 결제 승인
 * - 결제 정보 검증
 */
export const TossBillingService = {
  /**
   * 🔹 결제 승인 요청
   */
  async confirmPayment(paymentKey: string, orderId: string, amount: number) {
    try {
      const response = await axios.post(
        `${TOSS_API_URL}/confirm`,
        {
          paymentKey,
          orderId,
          amount
        },
        {
          headers: {
            Authorization:
              "Basic " + Buffer.from(TOSS_SECRET + ":").toString("base64"),
            "Content-Type": "application/json"
          }
        }
      );

      return response.data;
    } catch (err: any) {
      console.error("❌ TossBillingService.confirmPayment Error:", err.message);
      throw new Error(
        err.response?.data?.message || "Toss 결제 승인 실패"
      );
    }
  }
};
