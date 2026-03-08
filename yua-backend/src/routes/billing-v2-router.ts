/**
 * Billing V2 Router — Toss Mock 기반 크레딧 구매 + 구독 관리
 *
 * 기존 billing-router.ts (MySQL subscriptions + 실 Toss)와 분리.
 * 이 라우터는 PostgreSQL api_credits / credit_transactions / subscriptions 사용.
 *
 * 모든 엔드포인트: requireFirebaseAuth + withWorkspace 이후 마운트됨.
 */
import { Router, Request, Response } from "express";
import { pgPool } from "../db/postgres";
import { TossMock } from "../billing/toss-mock";

const router = Router();

/* ──────────────────────────────────────────
   Helpers
────────────────────────────────────────── */

function getWorkspaceId(req: any): string | null {
  const ws = req.workspace?.id;
  return ws ? String(ws) : null;
}

function getUserId(req: any): number | null {
  const raw = req.user?.id ?? req.user?.userId;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** 감사 로그 기록 (fire-and-forget) */
function auditLog(
  workspaceId: string,
  userId: number,
  action: string,
  detail: Record<string, unknown>
): void {
  pgPool
    .query(
      `INSERT INTO admin_audit_logs (admin_id, action, target_type, target_id, before_value, after_value, ip_address, created_at)
       VALUES ($1, $2, 'billing', $3, NULL, $4, 'system', NOW())`,
      [userId, action, workspaceId, JSON.stringify(detail)]
    )
    .catch((err) => {
      console.error("[BillingV2] audit log failed:", err.message);
    });
}

/* ──────────────────────────────────────────
   1. POST /billing/v2/purchase-credits
   크레딧 충전 (Toss Mock 결제 승인 → DB 반영)
────────────────────────────────────────── */
router.post("/v2/purchase-credits", async (req: Request, res: Response) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ ok: false, error: "unauthorized" });
    if (!workspaceId) return res.status(400).json({ ok: false, error: "workspace_required" });

    const { amount, paymentKey, orderId } = req.body ?? {};
    if (
      typeof amount !== "number" ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !paymentKey ||
      !orderId
    ) {
      return res.status(400).json({ ok: false, error: "invalid_params" });
    }

    // 1) Toss 결제 승인 (mock)
    const payment = await TossMock.approvePayment(paymentKey, orderId, amount);
    if (!payment.ok) {
      return res.status(502).json({ ok: false, error: "payment_approval_failed" });
    }

    // 2) DB 트랜잭션: credit_transaction + api_credits 갱신
    const client = await pgPool.connect();
    try {
      await client.query("BEGIN");

      // credit_transaction 삽입
      const txResult = await client.query(
        `INSERT INTO credit_transactions
           (api_key_id, workspace_id, amount, type, description, created_at)
         VALUES (0, $1, $2, 'purchase', $3, NOW())
         RETURNING id, amount, type, description, created_at`,
        [workspaceId, amount, `Toss purchase: ${orderId}`]
      );
      const transaction = txResult.rows[0];

      // api_credits upsert
      const creditResult = await client.query(
        `INSERT INTO api_credits (api_key_id, workspace_id, balance, total_purchased, total_used, last_recharged_at)
         VALUES (0, $1, $2, $2, 0, NOW())
         ON CONFLICT (api_key_id, workspace_id)
         DO UPDATE SET
           balance = api_credits.balance + $2,
           total_purchased = api_credits.total_purchased + $2,
           last_recharged_at = NOW()
         RETURNING balance`,
        [workspaceId, amount]
      );

      // api_credits에 workspace_id로 고유 레코드가 없을 수 있으므로 fallback
      let balance = creditResult.rows[0]?.balance ?? amount;

      // UNIQUE(api_key_id)이므로 workspace 단위 upsert가 안될 수 있음 — 별도 처리
      if (creditResult.rowCount === 0) {
        // ON CONFLICT 미작동 시: workspace 기준으로 직접 업데이트
        const upd = await client.query(
          `UPDATE api_credits
           SET balance = balance + $1, total_purchased = total_purchased + $1, last_recharged_at = NOW()
           WHERE workspace_id = $2
           RETURNING balance`,
          [amount, workspaceId]
        );
        if (upd.rowCount === 0) {
          await client.query(
            `INSERT INTO api_credits (api_key_id, workspace_id, balance, total_purchased, total_used, last_recharged_at)
             VALUES (0, $1, $2, $2, 0, NOW())`,
            [workspaceId, amount]
          );
          balance = amount;
        } else {
          balance = upd.rows[0].balance;
        }
      }

      await client.query("COMMIT");

      // 3) 감사 로그
      auditLog(workspaceId, userId, "purchase_credits", {
        amount,
        orderId,
        paymentKey,
        balance,
      });

      return res.json({ ok: true, balance: Number(balance), transaction });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error("[BillingV2] purchase-credits error:", err.message);
    return res.status(500).json({ ok: false, error: "purchase_failed" });
  }
});

/* ──────────────────────────────────────────
   2. POST /billing/v2/subscribe
   구독 생성/변경
────────────────────────────────────────── */
router.post("/v2/subscribe", async (req: Request, res: Response) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ ok: false, error: "unauthorized" });
    if (!workspaceId) return res.status(400).json({ ok: false, error: "workspace_required" });

    const { planId, customerKey } = req.body ?? {};
    if (!planId || !customerKey) {
      return res.status(400).json({ ok: false, error: "invalid_params" });
    }

    // 1) Toss 구독 생성 (mock)
    const tossSub = await TossMock.createSubscription(customerKey, planId);
    if (!tossSub.ok) {
      return res.status(502).json({ ok: false, error: "subscription_creation_failed" });
    }

    // 2) DB upsert (PG subscriptions)
    const now = new Date();
    const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // +30일

    const result = await pgPool.query(
      `INSERT INTO subscriptions (workspace_id, plan_id, status, toss_subscription_id, current_period_start, current_period_end, created_at)
       VALUES ($1, $2, 'active', $3, $4, $5, NOW())
       ON CONFLICT (workspace_id) DO UPDATE SET
         plan_id = $2,
         status = 'active',
         toss_subscription_id = $3,
         current_period_start = $4,
         current_period_end = $5,
         cancel_at = NULL
       RETURNING id, workspace_id, plan_id, status, toss_subscription_id, current_period_start, current_period_end, created_at`,
      [workspaceId, planId, tossSub.subscriptionId, now.toISOString(), periodEnd.toISOString()]
    );

    const subscription = result.rows[0];

    // 3) 감사 로그
    auditLog(workspaceId, userId, "subscribe", {
      planId,
      customerKey,
      subscriptionId: tossSub.subscriptionId,
    });

    return res.json({ ok: true, subscription });
  } catch (err: any) {
    console.error("[BillingV2] subscribe error:", err.message);
    return res.status(500).json({ ok: false, error: "subscribe_failed" });
  }
});

/* ──────────────────────────────────────────
   3. POST /billing/v2/cancel-subscription
   구독 취소
────────────────────────────────────────── */
router.post("/v2/cancel-subscription", async (req: Request, res: Response) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ ok: false, error: "unauthorized" });
    if (!workspaceId) return res.status(400).json({ ok: false, error: "workspace_required" });

    const { subscriptionId } = req.body ?? {};
    if (!subscriptionId) {
      return res.status(400).json({ ok: false, error: "subscription_id_required" });
    }

    // 1) Toss 구독 취소 (mock)
    const tossResult = await TossMock.cancelSubscription(subscriptionId);
    if (!tossResult.ok) {
      return res.status(502).json({ ok: false, error: "cancel_failed_upstream" });
    }

    // 2) DB 업데이트
    const result = await pgPool.query(
      `UPDATE subscriptions
       SET status = 'canceled', cancel_at = NOW()
       WHERE workspace_id = $1 AND toss_subscription_id = $2
       RETURNING id, workspace_id, plan_id, status, cancel_at`,
      [workspaceId, subscriptionId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ ok: false, error: "subscription_not_found" });
    }

    // 3) 감사 로그
    auditLog(workspaceId, userId, "cancel_subscription", { subscriptionId });

    return res.json({ ok: true });
  } catch (err: any) {
    console.error("[BillingV2] cancel-subscription error:", err.message);
    return res.status(500).json({ ok: false, error: "cancel_failed" });
  }
});

/* ──────────────────────────────────────────
   4. GET /billing/v2/subscription
   현재 구독 조회
────────────────────────────────────────── */
router.get("/v2/subscription", async (req: Request, res: Response) => {
  try {
    const workspaceId = getWorkspaceId(req);
    if (!workspaceId) return res.status(400).json({ ok: false, error: "workspace_required" });

    const { rows } = await pgPool.query(
      `SELECT id, workspace_id, plan_id, status, toss_subscription_id,
              current_period_start, current_period_end, cancel_at, created_at
       FROM subscriptions
       WHERE workspace_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [workspaceId]
    );

    return res.json({ ok: true, subscription: rows[0] ?? null });
  } catch (err: any) {
    console.error("[BillingV2] subscription error:", err.message);
    return res.status(500).json({ ok: false, error: "query_failed" });
  }
});

/* ──────────────────────────────────────────
   5. GET /billing/v2/credits
   크레딧 잔액 조회
────────────────────────────────────────── */
router.get("/v2/credits", async (req: Request, res: Response) => {
  try {
    const workspaceId = getWorkspaceId(req);
    if (!workspaceId) return res.status(400).json({ ok: false, error: "workspace_required" });

    const { rows } = await pgPool.query(
      `SELECT balance, total_purchased, total_used
       FROM api_credits
       WHERE workspace_id = $1
       LIMIT 1`,
      [workspaceId]
    );

    if (rows.length === 0) {
      return res.json({ ok: true, balance: 0, total_purchased: 0, total_used: 0 });
    }

    return res.json({
      ok: true,
      balance: Number(rows[0].balance),
      total_purchased: Number(rows[0].total_purchased),
      total_used: Number(rows[0].total_used),
    });
  } catch (err: any) {
    console.error("[BillingV2] credits error:", err.message);
    return res.status(500).json({ ok: false, error: "query_failed" });
  }
});

/* ──────────────────────────────────────────
   6. GET /billing/v2/transactions
   크레딧 거래 내역 (페이징)
────────────────────────────────────────── */
router.get("/v2/transactions", async (req: Request, res: Response) => {
  try {
    const workspaceId = getWorkspaceId(req);
    if (!workspaceId) return res.status(400).json({ ok: false, error: "workspace_required" });

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const offset = (page - 1) * limit;

    const [dataResult, countResult] = await Promise.all([
      pgPool.query(
        `SELECT id, amount, type, model, description, created_at
         FROM credit_transactions
         WHERE workspace_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [workspaceId, limit, offset]
      ),
      pgPool.query(
        `SELECT COUNT(*)::int AS total
         FROM credit_transactions
         WHERE workspace_id = $1`,
        [workspaceId]
      ),
    ]);

    return res.json({
      ok: true,
      data: dataResult.rows,
      total: countResult.rows[0]?.total ?? 0,
      page,
      limit,
    });
  } catch (err: any) {
    console.error("[BillingV2] transactions error:", err.message);
    return res.status(500).json({ ok: false, error: "query_failed" });
  }
});

/* ──────────────────────────────────────────
   7. GET /billing/v2/usage
   사용량 분석 (일별 + 모델별 + 총합)
   Query params: from, to, days (default 30)
────────────────────────────────────────── */
router.get("/v2/usage", async (req: Request, res: Response) => {
  try {
    const workspaceId = getWorkspaceId(req);
    if (!workspaceId) return res.status(400).json({ ok: false, error: "workspace_required" });

    // Resolve date range
    const days = Math.min(365, Math.max(1, Number(req.query.days) || 30));
    let fromDate: string;
    let toDate: string;

    if (typeof req.query.from === "string" && /^\d{4}-\d{2}-\d{2}$/.test(req.query.from)) {
      fromDate = req.query.from;
    } else {
      const d = new Date();
      d.setDate(d.getDate() - days);
      fromDate = d.toISOString().slice(0, 10);
    }

    if (typeof req.query.to === "string" && /^\d{4}-\d{2}-\d{2}$/.test(req.query.to)) {
      toDate = req.query.to;
    } else {
      toDate = new Date().toISOString().slice(0, 10);
    }

    // Run daily + byModel + total queries in parallel
    const [dailyResult, byModelResult, totalResult] = await Promise.all([
      // Daily aggregation
      pgPool.query(
        `SELECT
           TO_CHAR(created_at, 'YYYY-MM-DD') AS date,
           COUNT(*)::int AS calls,
           COALESCE(SUM(ABS(amount)), 0)::numeric(12,4) AS credits
         FROM credit_transactions
         WHERE workspace_id = $1
           AND type = 'usage'
           AND created_at >= $2::date
           AND created_at < ($3::date + INTERVAL '1 day')
         GROUP BY TO_CHAR(created_at, 'YYYY-MM-DD')
         ORDER BY date ASC`,
        [workspaceId, fromDate, toDate]
      ),
      // By-model aggregation
      pgPool.query(
        `SELECT
           COALESCE(model, 'unknown') AS model,
           COUNT(*)::int AS calls,
           COALESCE(SUM(ABS(amount)), 0)::numeric(12,4) AS credits
         FROM credit_transactions
         WHERE workspace_id = $1
           AND type = 'usage'
           AND created_at >= $2::date
           AND created_at < ($3::date + INTERVAL '1 day')
         GROUP BY COALESCE(model, 'unknown')
         ORDER BY credits DESC`,
        [workspaceId, fromDate, toDate]
      ),
      // Total
      pgPool.query(
        `SELECT
           COUNT(*)::int AS calls,
           COALESCE(SUM(ABS(amount)), 0)::numeric(12,4) AS credits
         FROM credit_transactions
         WHERE workspace_id = $1
           AND type = 'usage'
           AND created_at >= $2::date
           AND created_at < ($3::date + INTERVAL '1 day')`,
        [workspaceId, fromDate, toDate]
      ),
    ]);

    const daily = dailyResult.rows.map((r) => ({
      date: r.date,
      calls: r.calls,
      credits: Number(r.credits),
    }));

    const byModel = byModelResult.rows.map((r) => ({
      model: r.model,
      calls: r.calls,
      credits: Number(r.credits),
    }));

    const totalRow = totalResult.rows[0];
    const total = {
      calls: totalRow?.calls ?? 0,
      credits: Number(totalRow?.credits ?? 0),
    };

    return res.json({ ok: true, daily, byModel, total, from: fromDate, to: toDate });
  } catch (err: any) {
    console.error("[BillingV2] usage error:", err.message);
    return res.status(500).json({ ok: false, error: "query_failed" });
  }
});

export default router;
