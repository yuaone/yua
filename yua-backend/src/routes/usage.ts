import { Router } from "express";
import { pool } from "../db/mysql";
import { SubscriptionRepo } from "../db/repositories/subscription-repo";
import type { RowDataPacket } from "mysql2";

const router = Router();

type PlanType = "free" | "pro" | "business" | "enterprise";

const MESSAGE_LIMIT_BY_TIER: Record<PlanType, number | null> = {
  free: 20,
  pro: 200,
  business: null,
  enterprise: null,
};

const COOLDOWN_HOURS = 5;

function normalizePlan(raw?: string | null): PlanType {
  const v = String(raw ?? "free").toLowerCase();
  if (v.includes("enterprise")) return "enterprise";
  if (v.includes("business")) return "business";
  if (v.includes("pro") || v.includes("premium")) return "pro";
  return "free";
}

router.get("/status", async (req: any, res) => {
  try {
    const userId = req.user?.userId as string | undefined;
    if (!userId) {
      return res.status(401).json({ error: "unauthorized" });
    }

    const sub = await SubscriptionRepo.getByUserId(userId);
    const tier = normalizePlan(sub?.plan);
    const limit = MESSAGE_LIMIT_BY_TIER[tier];

    const [usageRows] = await pool.query<RowDataPacket[]>(
      `
      SELECT message_count, updated_at
      FROM yua_usage_daily
      WHERE user_id = ?
        AND date = CURDATE()
      LIMIT 1
      `,
      [userId]
    );

    const used = Number(usageRows?.[0]?.message_count ?? 0);

    // 🔥 무제한 플랜
    if (limit === null) {
      return res.json({
        tier,
        used,
        limit: null,
        locked: false,
        cooldownUntil: null,
      });
    }

    // 🔥 아직 제한 미도달
    if (used < limit) {
      return res.json({
        tier,
        used,
        limit,
        locked: false,
        cooldownUntil: null,
      });
    }

    // 🔥 제한 도달 → 쿨다운 계산
    const updatedAt = usageRows?.[0]?.updated_at
      ? new Date(usageRows[0].updated_at).getTime()
      : Date.now();

    const cooldownUntil = new Date(
      updatedAt + COOLDOWN_HOURS * 60 * 60 * 1000
    );

    const now = Date.now();
    const locked = now < cooldownUntil.getTime();

    // 🔥 쿨다운 끝났으면 → 카운트 리셋
    if (!locked) {
      await pool.query(
        `
        UPDATE yua_usage_daily
        SET message_count = 0
        WHERE user_id = ?
          AND date = CURDATE()
        `,
        [userId]
      );

      return res.json({
        tier,
        used: 0,
        limit,
        locked: false,
        cooldownUntil: null,
      });
    }

    // 🔥 아직 쿨다운 중
    return res.json({
      tier,
      used,
      limit,
      locked: true,
      cooldownUntil,
    });
  } catch (e) {
    return res.status(500).json({ error: "usage_status_failed" });
  }
});

export default router;