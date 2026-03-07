import { pool } from "../db/mysql";
import type { RowDataPacket } from "mysql2";
import { TossBillingService } from "../service/toss-billing-service";
import { pgPool } from "../db/postgres";
import { sendBillingFailureEmail } from "./email-service";
import { planToTier, TIER_PRIORITY } from "./subscription-tier";

const PLAN_PRICE_MAP: Record<string, number> = {
  free: 0,
  pro: 19000,
  business: 55000,
  enterprise: 140000,
};

export async function runSubscriptionRenewal(): Promise<number> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, user_id, workspace_id
     FROM subscriptions
     WHERE status = 'active'
       AND next_billing_at IS NOT NULL
       AND next_billing_at <= NOW()`
  );

  if (!rows.length) return 0;

  let processed = 0;
  for (const r of rows) {
    const subId = Number(r.id);
    const userId = String(r.user_id ?? "");
    const workspaceId = String(r.workspace_id ?? "");
    if (!subId || !userId || !workspaceId) continue;

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [lockedRows] = await connection.query<RowDataPacket[]>(
        `SELECT id, user_id, workspace_id, plan, status, order_id, payment_key, next_billing_at, renewal_attempts, scheduled_downgrade_plan
         FROM subscriptions
         WHERE id = ?
           AND status = 'active'
           AND next_billing_at IS NOT NULL
           AND next_billing_at <= NOW()
         FOR UPDATE`,
        [subId]
      );

      if (!lockedRows.length) {
        await connection.rollback();
        continue;
      }

      const sub = lockedRows[0];
      const planKey = String(sub.plan ?? "free").toLowerCase();
      const amount = PLAN_PRICE_MAP[planKey] ?? 0;
      const orderId = String(sub.order_id ?? "");
      const paymentKey = String(sub.payment_key ?? "");
      const scheduledPlan = String(sub.scheduled_downgrade_plan ?? "");
      const attemptsBefore = Number(sub.renewal_attempts ?? 0);

      let success = false;
      try {
        if (!orderId || !paymentKey) {
          throw new Error("missing_payment_reference");
        }
        await TossBillingService.confirmPayment(paymentKey, orderId, amount);
        success = true;
      } catch {
        success = false;
      }

      if (success) {
        await connection.query(
          `UPDATE subscriptions
           SET status = 'active',
               next_billing_at = DATE_ADD(NOW(), INTERVAL 1 MONTH),
               grace_until = NULL,
               renewal_attempts = 0
           WHERE id = ?`,
          [subId]
        );
        await connection.commit();

        if (scheduledPlan) {
          const currentTier = planToTier(String(sub.plan));
          const targetTier = planToTier(scheduledPlan);
          if ((TIER_PRIORITY[targetTier] ?? 0) < (TIER_PRIORITY[currentTier] ?? 0)) {
            await pool.query(
              `UPDATE subscriptions
               SET plan = ?, scheduled_downgrade_plan = NULL
               WHERE id = ?`,
              [scheduledPlan, subId]
            );
            await pgPool.query(
              `INSERT INTO workspace_plan_state (workspace_id, tier, status, source)
               VALUES ($1, $2, 'active', $3)
               ON CONFLICT (workspace_id)
               DO UPDATE SET
                 tier = EXCLUDED.tier,
                 status = 'active',
                 source = EXCLUDED.source,
                 updated_at = now()`,
              [workspaceId, targetTier, "renewal_worker"]
            );
          }
        }

        console.log(`[Billing][Renewal] user=${userId} workspace=${workspaceId} status=success`);
      } else {
        await connection.query(
          `UPDATE subscriptions
           SET status = 'pending',
               grace_until = DATE_ADD(NOW(), INTERVAL 3 DAY),
               renewal_attempts = COALESCE(renewal_attempts, 0) + 1
           WHERE id = ?`,
          [subId]
        );
        await connection.commit();
        console.log(`[Billing][Renewal] user=${userId} workspace=${workspaceId} status=failed`);
        if (attemptsBefore === 0) {
          await sendBillingFailureEmail({
            userId,
            workspaceId,
            plan: String(sub.plan ?? ""),
            graceUntil: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
          });
        }
      }

      processed++;
    } catch {
      try {
        await connection.rollback();
      } catch {}
    } finally {
      connection.release();
    }
  }

  return processed;
}
