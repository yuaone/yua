import { pool } from "../db/mysql";
import { pgPool } from "../db/postgres";
import type { RowDataPacket } from "mysql2";

export async function checkExpiredSubscriptions(): Promise<number> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT user_id, workspace_id
     FROM subscriptions
     WHERE status IN ('active', 'trial')
       AND next_billing_at IS NOT NULL
       AND next_billing_at < NOW()`
  );

  if (!rows.length) return 0;

  let expiredCount = 0;
  for (const r of rows) {
    const userId = String(r.user_id ?? "");
    const workspaceId = String(r.workspace_id ?? "");
    if (!userId || !workspaceId) continue;

    await pool.query(
      `UPDATE subscriptions
       SET status = 'expired'
       WHERE user_id = ?
       ORDER BY id DESC
       LIMIT 1`,
      [userId]
    );

    await pgPool.query(
      `INSERT INTO workspace_plan_state (workspace_id, tier, status, source)
       VALUES ($1, 'free', 'expired', $2)
       ON CONFLICT (workspace_id)
       DO UPDATE SET
         tier = 'free',
         status = 'expired',
         source = EXCLUDED.source,
         updated_at = now()`,
      [workspaceId, "expiration_worker"]
    );

    console.log(`[Billing] user=${userId} workspace=${workspaceId} action=expire status=expired`);
    expiredCount++;
  }

  const [pendingRows] = await pool.query<RowDataPacket[]>(
    `SELECT user_id, workspace_id
     FROM subscriptions
     WHERE status = 'pending'
       AND grace_until IS NOT NULL
       AND grace_until < NOW()`
  );

  for (const r of pendingRows) {
    const userId = String(r.user_id ?? "");
    const workspaceId = String(r.workspace_id ?? "");
    if (!userId || !workspaceId) continue;

    await pool.query(
      `UPDATE subscriptions
       SET status = 'expired'
       WHERE user_id = ?
       ORDER BY id DESC
       LIMIT 1`,
      [userId]
    );

    await pgPool.query(
      `INSERT INTO workspace_plan_state (workspace_id, tier, status, source)
       VALUES ($1, 'free', 'expired', $2)
       ON CONFLICT (workspace_id)
       DO UPDATE SET
         tier = 'free',
         status = 'expired',
         source = EXCLUDED.source,
         updated_at = now()`,
      [workspaceId, "expiration_worker"]
    );

    console.log(`[Billing][Renewal] user=${userId} workspace=${workspaceId} status=expired`);
    expiredCount++;
  }

  return expiredCount;
}
