import { pool } from "../mysql";
import { RowDataPacket, ResultSetHeader } from "mysql2";

// -----------------------------
// Types
// -----------------------------
export interface Subscription {
  id?: number;
  user_id: string;
  workspace_id?: string | null;
  plan: string; // free / premium / business_premium / developer / developer_pro / enterprise_developer
  status: "active" | "pending" | "trial" | "canceled" | "expired";
  order_id?: string | null;
  payment_key?: string | null;
  provider?: string | null; // toss / stripe
  next_billing_at?: Date | null;
  grace_until?: Date | null;
  renewal_attempts?: number | null;
  scheduled_downgrade_plan?: string | null;
  created_at?: Date;
}

// -----------------------------
// Repository
// -----------------------------
export const SubscriptionRepo = {
  /**
   * 🟦 사용자 구독 조회
   */
  async getByUserId(userId: string): Promise<Subscription | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM subscriptions
       WHERE user_id = ?
       ORDER BY id DESC
       LIMIT 1`,
      [userId]
    );

    if (!rows.length) return null;
    return rows[0] as Subscription;
  },
  /**
   * 🟦 주문 ID로 구독 조회
   */
  async getByOrderId(orderId: string): Promise<Subscription | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM subscriptions
       WHERE order_id = ?
       ORDER BY id DESC
       LIMIT 1`,
      [orderId]
    );

    if (!rows.length) return null;
    return rows[0] as Subscription;
  },

  /**
   * 🟩 구독 생성
   */
  async create(sub: Subscription): Promise<number> {
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO subscriptions
         (user_id, workspace_id, plan, status, order_id, payment_key, provider, next_billing_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sub.user_id,
        sub.workspace_id ?? null,
        sub.plan,
        sub.status ?? "active",
        sub.order_id ?? null,
        sub.payment_key ?? null,
        sub.provider ?? "toss",
        sub.next_billing_at ?? null
      ]
    );

    return result.insertId;
  },

  /**
   * 🟨 구독 상태 업데이트
   * (취소 / 만료 / 플랜변경)
   */
  async updateStatus(
    userId: string,
    status: "active" | "canceled" | "expired"
  ): Promise<void> {
    await pool.query(
      `UPDATE subscriptions SET status = ?
       WHERE user_id = ?
       ORDER BY id DESC
       LIMIT 1`,
      [status, userId]
    );
  },
  /**
   * 🟨 상태 전이 안전 업데이트
   */
  async updateStatusSafe(
    userId: string,
    newStatus: "active" | "pending" | "trial" | "canceled" | "expired"
  ): Promise<void> {
    const current = await this.getByUserId(userId);
    const from = current?.status ?? null;

    const allowed: Record<string, Set<string>> = {
      pending: new Set(["active"]),
      active: new Set(["canceled", "expired"]),
      trial: new Set(["active", "expired"]),
    };

    if (!from || !allowed[from] || !allowed[from].has(newStatus)) {
      throw new Error(`invalid_subscription_transition:${from ?? "none"}->${newStatus}`);
    }

    await pool.query(
      `UPDATE subscriptions SET status = ?
       WHERE user_id = ?
       ORDER BY id DESC
       LIMIT 1`,
      [newStatus, userId]
    );
  },

  /**
   * 🟧 결제 정보 업데이트 (Toss/Stripe)
   */
  async updatePaymentInfo(
    userId: string,
    orderId: string,
    paymentKey: string,
    provider: string = "toss"
  ): Promise<void> {
    await pool.query(
      `UPDATE subscriptions
       SET payment_key = ?, provider = ?
       WHERE user_id = ?
       AND order_id = ?
       LIMIT 1`,
      [paymentKey, provider, userId, orderId]
    );
  },

  /**
   * 🟥 플랜 변경 (수동 업그레이드/다운그레이드 지원)
   */
  async changePlan(userId: string, plan: string): Promise<void> {
    await pool.query(
      `UPDATE subscriptions
       SET plan = ?
       WHERE user_id = ?
       ORDER BY id DESC
       LIMIT 1`,
      [plan, userId]
    );
  },

  /**
   * 🟪 다음 결제일 저장
   */
  async setNextBilling(userId: string, nextBill: Date): Promise<void> {
    await pool.query(
      `UPDATE subscriptions
       SET next_billing_at = ?
       WHERE user_id = ?
       ORDER BY id DESC
       LIMIT 1`,
      [nextBill, userId]
    );
  }
};
