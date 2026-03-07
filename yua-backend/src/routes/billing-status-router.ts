import { Router } from "express";
import { pool } from "../db/mysql";
import { pgPool } from "../db/postgres";
import type { RowDataPacket } from "mysql2";

const router = Router();

/**
 * GET /api/billing/status
 * Workspace 기준 현재 구독 상태 조회
 */
router.get("/status", async (req: any, res) => {
  try {
    const workspaceId = req.workspace?.id;

    if (!workspaceId) {
      return res.status(400).json({ ok: false, error: "workspace_required" });
    }

    // 1️⃣ MySQL subscription 조회
    const [rows] = await pool.query<RowDataPacket[]>(
      `
      SELECT
        plan,
        status,
        next_billing_at,
        grace_until,
        renewal_attempts,
        scheduled_downgrade_plan
      FROM subscriptions
      WHERE workspace_id = ?
      ORDER BY id DESC
      LIMIT 1
      `,
      [workspaceId]
    );

    const sub = rows?.[0];

    // subscription 없으면 free 처리
    if (!sub) {
      return res.json({
        workspaceId,
        tier: "free",
        plan: "free",
        status: "active",
        nextBillingAt: null,
        graceUntil: null,
        renewalAttempts: 0,
        scheduledDowngradePlan: null,
      });
    }

    // 2️⃣ PG workspace_plan_state 조회 (SSOT tier)
    const { rows: pgRows } = await pgPool.query(
      `
      SELECT tier
      FROM workspace_plan_state
      WHERE workspace_id = $1
      LIMIT 1
      `,
      [workspaceId]
    );

    const tier = pgRows?.[0]?.tier ?? "free";

    return res.json({
      workspaceId,
      tier,
      plan: sub.plan,
      status: sub.status,
      nextBillingAt: sub.next_billing_at,
      graceUntil: sub.grace_until,
      renewalAttempts: sub.renewal_attempts ?? 0,
      scheduledDowngradePlan: sub.scheduled_downgrade_plan ?? null,
    });
  } catch (err: any) {
    return res.status(500).json({
      ok: false,
      error: err?.message || "billing_status_failed",
    });
  }
});

export default router;
