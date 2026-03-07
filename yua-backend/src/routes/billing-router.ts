import { Router } from "express";
import crypto from "crypto";
import { TossBillingService } from "../service/toss-billing-service";
import { SubscriptionRepo } from "../db/repositories/subscription-repo";
import { pgPool } from "../db/postgres";
import { checkExpiredSubscriptions } from "../services/subscription-expiration-worker";
import { redisPub } from "../db/redis";
import { planToTier, TIER_PRIORITY } from "../services/subscription-tier";
import { pool } from "../db/mysql";

const router = Router();


const ALLOWED_PLANS = new Set(["pro", "business", "enterprise"]);
const TRIAL_PLAN = "trial_pro";
const PLAN_PRICE_MAP: Record<string, number> = {
  free: 0,
  pro: 19000,
  business: 49000,
  enterprise: 99000,
};

function getUserId(req: any): number | null {
  const raw = req.user?.id ?? req.user?.userId;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function getWorkspaceId(req: any): string | null {
  const ws = req.workspace?.id;
  return typeof ws === "string" && ws.length > 0 ? ws : null;
}

function verifyTossWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.TOSS_WEBHOOK_SECRET ?? "";
  if (!secret || !signature) return false;
  const hmac = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signature));
  } catch {
    return false;
  }
}

/**
 * 🟦 POST /billing/create
 * - 프론트에서 결제 시작 시 orderId 생성
 * - (mock에서도 동일하게 사용)
 */
router.post("/create", async (req: any, res) => {
  try {
    const userId = getUserId(req);
    const workspaceId = getWorkspaceId(req);
    if (!userId) return res.status(401).json({ ok: false, error: "unauthorized" });
    if (!workspaceId) return res.status(400).json({ ok: false, error: "workspace_required" });

    const { plan, amount } = req.body;

    if (typeof plan !== "string" || !plan.trim() || typeof amount !== "number" || !Number.isFinite(amount)) {
      return res.status(400).json({ ok: false, error: "Missing fields" });
    }
    const planKey = String(plan).toLowerCase();
    const isTrial = planKey === TRIAL_PLAN;
    if (!isTrial && !ALLOWED_PLANS.has(planKey)) {
      return res.status(400).json({ ok: false, error: "invalid_plan" });
    }

    const orderId = `yua_${userId}_${Date.now()}`;

    await SubscriptionRepo.create({
      user_id: String(userId),
      workspace_id: workspaceId,
      plan: String(plan),
      status: isTrial ? "trial" : "pending",
      order_id: orderId,
      payment_key: null,
      provider: "toss",
      next_billing_at: isTrial ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : null,
    });

    console.log(
      `[Billing] user=${userId} workspace=${workspaceId} action=create status=${isTrial ? "trial" : "pending"}`
    );
    return res.json({ ok: true, orderId });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message || String(err) });
  }
});

/**
 * 🟩 POST /billing/confirm
 * - 실결제: Toss confirm 호출
 * - Mock: paymentKey=MOCK_* 이면 Toss 호출 스킵 + 바로 승인 처리
 */
router.post("/confirm", async (req: any, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ ok: false, error: "unauthorized" });

    const { paymentKey, orderId, amount } = req.body;

    if (!paymentKey || !orderId || typeof amount !== "number" || !Number.isFinite(amount)) {
      return res.status(400).json({ ok: false, error: "Missing fields" });
    }

    const isMock = String(paymentKey).startsWith("MOCK_") || process.env.BILLING_MODE === "mock";

    // ✅ 최소 안전: 이 user의 최신 order가 맞는지 확인 (body user_id 신뢰 제거)
    const latest = await SubscriptionRepo.getByOrderId(String(orderId));
    if (!latest || latest.user_id !== String(userId)) {
      return res.status(404).json({ ok: false, error: "order_not_found" });
    }
    const workspaceId = latest.workspace_id;
    if (!workspaceId) {
      return res.status(400).json({ ok: false, error: "workspace_required" });
    }

    if (latest.status === "active") {
const { rows: wsRows } = await pgPool.query(
  `SELECT tier FROM workspace_plan_state WHERE workspace_id = $1 LIMIT 1`,
  [workspaceId]
);

const currentTier = String(wsRows?.[0]?.tier ?? "free");
      const currentPriority = TIER_PRIORITY[currentTier] ?? 0;
      const targetTier = planToTier(String(latest.plan));
      const targetPriority = TIER_PRIORITY[targetTier] ?? 0;

      if (targetPriority === currentPriority) {
        return res.json({ ok: true, approved: true, idempotent: true });
      }

      if (targetPriority > currentPriority) {
        await pool.query(
          `UPDATE subscriptions
           SET plan = ?
           WHERE user_id = ?
           ORDER BY id DESC
           LIMIT 1`,
          [String(latest.plan), String(userId)]
        );
        await pgPool.query(
          `
          INSERT INTO workspace_plan_state (workspace_id, tier, status, source)
          VALUES ($1, $2, 'active', $3)
          ON CONFLICT (workspace_id)
          DO UPDATE SET
            tier = EXCLUDED.tier,
            status = 'active',
            source = EXCLUDED.source,
            updated_at = now()
          `,
          [workspaceId, targetTier, "toss_confirm_upgrade"]
        );
        await SubscriptionRepo.updateStatusSafe(String(latest.user_id), "active");
        console.log(
          `[Billing][Upgrade] workspace=${workspaceId} from=${currentTier} to=${targetTier}`
        );
        return res.json({ ok: true, approved: true });
      }

      if (targetPriority < currentPriority) {
        await pool.query(
          `UPDATE subscriptions
           SET scheduled_downgrade_plan = ?
           WHERE user_id = ?
           ORDER BY id DESC
           LIMIT 1`,
          [String(latest.plan), String(userId)]
        );
        return res.json({ ok: true, scheduled: true });
      }
      return res.json({ ok: true, idempotent: true });
    }

    const planKey = String(latest.plan ?? "free").toLowerCase();
    const expectedAmount = PLAN_PRICE_MAP[planKey] ?? 0;
    if (Number(amount) !== expectedAmount) {
      console.log(
        `[Billing] user=${userId} workspace=${workspaceId} action=confirm status=amount_mismatch`
      );
      return res.status(400).json({ ok: false, error: "amount_mismatch" });
    }

    // 1) 결제 승인
    const payment =
      isMock
        ? { mock: true, orderId, paymentKey, amount }
        : await TossBillingService.confirmPayment(paymentKey, orderId, amount);

    // 2) MySQL subscriptions 업데이트
    await SubscriptionRepo.updatePaymentInfo(String(userId), orderId, paymentKey, "toss");

   await pool.query(
   `
   UPDATE subscriptions
   SET
     amount = ?,
     currency = 'KRW',
     paid_at = NOW()
   WHERE order_id = ?
   `,
   [amount, orderId]
 );

    // 3) ✅ workspace_plan_state 반영 (핵심 SSOT: req.workspace.id)
    const tier = planToTier(String(latest.plan));

    await pgPool.query(
      `
      INSERT INTO workspace_plan_state (workspace_id, tier, status, source)
      VALUES ($1, $2, 'active', $3)
      ON CONFLICT (workspace_id)
      DO UPDATE SET
        tier = EXCLUDED.tier,
        status = 'active',
        source = EXCLUDED.source,
        updated_at = now()
      `,
      [workspaceId, tier, isMock ? "mock" : "toss"]
    );

    console.log(`[Billing] user=${userId} workspace=${workspaceId} action=confirm status=active`);
    return res.json({ ok: true, approved: true, payment });
  } catch (err: any) {
    return res.status(500).json({
      ok: false,
      error: err?.message || "Payment confirmation error",
    });
  }
});

/**
 * 🟦 GET /billing/history
 * Workspace 기준 결제 이력 조회
 */
router.get("/history", async (req: any, res) => {
  try {
    const workspaceId = getWorkspaceId(req);
    if (!workspaceId) {
      return res.status(400).json({ ok: false, error: "workspace_required" });
    }

    const [rows] = await pool.query(
      `
      SELECT
        plan,
        status,
        amount,
        currency,
        order_id,
        payment_key,
        paid_at,
        created_at,
        next_billing_at,
        scheduled_downgrade_plan
      FROM subscriptions
      WHERE workspace_id = ?
      ORDER BY created_at DESC
      LIMIT 20
      `,
      [workspaceId]
    );

    return res.json({
      ok: true,
      workspaceId,
      items: rows,
    });
  } catch (err: any) {
    return res.status(500).json({
      ok: false,
      error: err?.message || "billing_history_failed",
    });
  }
});

/**
 * 🟧 POST /billing/webhook
 * - Toss 서버 webhook 처리
 */
router.post("/webhook", async (req: any, res) => {
  try {
    // TODO: ensure rawBody is captured by middleware before JSON parsing
    const rawBody =
      (req as any).rawBody ??
      (Buffer.isBuffer(req.body)
        ? req.body.toString("utf8")
        : typeof req.body === "string"
        ? req.body
        : JSON.stringify(req.body ?? {}));
    const signature = String(req.headers["toss-signature"] ?? "");
    if (!verifyTossWebhookSignature(rawBody, signature)) {
      return res.status(401).json({ ok: false, error: "invalid_signature" });
    }

    const body = req.body ?? {};
    const eventType = String(body.eventType ?? body.type ?? body.event ?? "");
    const allowedEvents = new Set([
      "PAYMENT_CONFIRMED",
      "PAYMENT_CANCELED",
      "PAYMENT_FAILED",
    ]);
    if (!allowedEvents.has(eventType)) {
      return res.json({ ok: true, ignored: true });
    }

    const orderId = String(body.orderId ?? "");
    const eventId = String(body.eventId ?? body.data?.eventId ?? body.paymentKey ?? "");
    if (!orderId) {
      return res.status(400).json({ ok: false, error: "order_id_required" });
    }
    if (!eventId) {
      return res.status(400).json({ ok: false, error: "event_id_required" });
    }

    const replayKey = `toss:webhook:${orderId}:${eventId}`;
    try {
      await redisPub.connect().catch(() => {});
 const setRes = await redisPub.call(
   "SET",
   replayKey,
   "1",
   "NX",
   "EX",
   "600"
 );
      if (setRes !== "OK") {
        return res.json({ ok: true, idempotent: true });
      }
    } catch {
      return res.status(500).json({ ok: false, error: "replay_protection_failed" });
    }

    const sub = await SubscriptionRepo.getByOrderId(orderId);
    if (!sub) {
      return res.status(404).json({ ok: false, error: "subscription_not_found" });
    }

    const workspaceId = sub.workspace_id;
    if (!workspaceId) {
      return res.status(400).json({ ok: false, error: "workspace_required" });
    }

    const isApproved = eventType === "PAYMENT_CONFIRMED";
    const isCanceled = eventType === "PAYMENT_CANCELED" || eventType === "PAYMENT_FAILED";

    if (isApproved) {
      if (sub.status === "active") {
        console.log(
          `[Billing][Webhook] user=${sub.user_id} workspace=${workspaceId} order=${orderId} event=${eventType} status=active`
        );
        return res.json({ ok: true, idempotent: true });
      }
      await SubscriptionRepo.updateStatusSafe(String(sub.user_id), "active");

      const tier = planToTier(String(sub.plan));
      await pgPool.query(
        `
        INSERT INTO workspace_plan_state (workspace_id, tier, status, source)
        VALUES ($1, $2, 'active', $3)
        ON CONFLICT (workspace_id)
        DO UPDATE SET
          tier = EXCLUDED.tier,
          status = 'active',
          source = EXCLUDED.source,
          updated_at = now()
        `,
        [workspaceId, tier, "toss_webhook"]
      );
      console.log(
        `[Billing][Webhook] user=${sub.user_id} workspace=${workspaceId} order=${orderId} event=${eventType} status=active`
      );
    } else if (isCanceled) {
      if (sub.status === "canceled") {
        console.log(
          `[Billing][Webhook] user=${sub.user_id} workspace=${workspaceId} order=${orderId} event=${eventType} status=canceled`
        );
        return res.json({ ok: true, idempotent: true });
      }
      await SubscriptionRepo.updateStatusSafe(String(sub.user_id), "canceled");

      // NOTE: canceled 상태에서는 즉시 downgrade 하지 않는다.
      // next_billing_at 까지 기존 tier 유지 후 만료 시점에 downgrade 처리.
      await pgPool.query(
        `
        INSERT INTO workspace_plan_state (workspace_id, tier, status, source)
        VALUES ($1, $2, 'canceled', $3)
        ON CONFLICT (workspace_id)
        DO UPDATE SET
          status = 'canceled',
          source = EXCLUDED.source,
          updated_at = now()
        `,
        [workspaceId, planToTier(String(sub.plan)), "toss_webhook"]
      );
      console.log(
        `[Billing][Webhook] user=${sub.user_id} workspace=${workspaceId} order=${orderId} event=${eventType} status=canceled`
      );
    }

    return res.json({ ok: true });
  } catch (err: any) {
    return res.status(500).json({
      ok: false,
      error: err?.message || "Webhook error",
    });
  }
});

/**
 * 🟦 POST /billing/run-expiration-check
 * - Manual expiration runner (admin only)
 */
router.post("/run-expiration-check", async (req: any, res) => {
  try {
    const userRole = String(req.user?.role ?? "");
    if (userRole !== "admin") {
      return res.status(403).json({ ok: false, error: "forbidden" });
    }

    const expiredCount = await checkExpiredSubscriptions();
    return res.json({ ok: true, expired: expiredCount });
  } catch (err: any) {
    return res.status(500).json({ ok: false, error: err?.message || "run_expiration_failed" });
  }
});

export default router;
