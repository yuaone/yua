// 📂 src/middleware/check-usage.ts
// 🔥 UsageLimit (MySQL SSOT, user-based)

import { Request, Response, NextFunction } from "express";
import { errorFormat } from "../utils/error-format";
import { SubscriptionRepo } from "../db/repositories/subscription-repo";
import { pool } from "../db/mysql";
import type { RowDataPacket } from "mysql2";
import { resolveEffectivePlan } from "../services/subscription-resolver";

export async function checkUsageLimit(req: Request, res: Response, next: NextFunction) {
  let connection;
  try {
    const userId = (req as any)?.user?.userId as string | undefined;
    if (!userId) {
      return res.status(401).json(errorFormat("unauthorized", "User required", 401));
    }

    const sub = await SubscriptionRepo.getByUserId(userId);
    const { plan, isTrial } = resolveEffectivePlan(sub);

    const dailyLimit = isTrial ? 50 : plan === "free" ? 20 : Infinity;
    const monthlyLimit = isTrial
      ? 1000
      : plan === "free"
      ? 400
      : plan === "pro"
      ? 1000
      : plan === "business"
      ? 4000
      : Infinity;
    const imageDailyLimit = isTrial ? 5 : plan === "free" ? 2 : Infinity;

    const imageUsed =
      req.body?.image === true ||
      req.body?.imageUsed === true ||
      req.body?.isImage === true ||
      (typeof req.body?.imageCount === "number" && req.body.imageCount > 0) ||
      (Array.isArray(req.body?.attachments) &&
        req.body.attachments.some((a: any) => a?.kind === "image"));
    const imageInc = imageUsed ? 1 : 0;

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [dailyRows] = await connection.query<RowDataPacket[]>(
      `SELECT calls, image_calls
       FROM yua_usage_daily
       WHERE user_id = ? AND date = CURDATE()
       FOR UPDATE`,
      [userId]
    );

    if (!dailyRows.length) {
      await connection.query(
        `INSERT INTO yua_usage_daily
          (user_id, date, calls, image_calls, total_tokens, cost_unit)
         VALUES (?, CURDATE(), 0, 0, 0, 0)`,
        [userId]
      );
    }

    const [monthlyRows] = await connection.query<RowDataPacket[]>(
      `SELECT calls
       FROM yua_usage_monthly
       WHERE user_id = ? AND year = YEAR(CURDATE()) AND month = MONTH(CURDATE())
       FOR UPDATE`,
      [userId]
    );

    if (!monthlyRows.length) {
      await connection.query(
        `INSERT INTO yua_usage_monthly
          (user_id, year, month, calls, total_tokens, cost_unit)
         VALUES (?, YEAR(CURDATE()), MONTH(CURDATE()), 0, 0, 0)`,
        [userId]
      );
    }

    const dailyCalls = Number(dailyRows?.[0]?.calls ?? 0);
    const dailyImageCalls = Number(dailyRows?.[0]?.image_calls ?? 0);
    const monthlyCalls = Number(monthlyRows?.[0]?.calls ?? 0);

    if (dailyCalls + 1 > dailyLimit) {
      await connection.rollback();
      return res.status(429).json({
        ok: false,
        error: "usage_limit_exceeded",
        reason: "daily",
      });
    }

    if (monthlyCalls + 1 > monthlyLimit) {
      await connection.rollback();
      return res.status(429).json({
        ok: false,
        error: "usage_limit_exceeded",
        reason: "monthly",
      });
    }

    if (imageUsed && dailyImageCalls + 1 > imageDailyLimit) {
      await connection.rollback();
      return res.status(429).json({
        ok: false,
        error: "usage_limit_exceeded",
        reason: "image",
      });
    }

    await connection.query(
      `UPDATE yua_usage_daily
       SET calls = calls + 1,
           image_calls = image_calls + ?
       WHERE user_id = ? AND date = CURDATE()`,
      [imageInc, userId]
    );

    await connection.query(
      `UPDATE yua_usage_monthly
       SET calls = calls + 1
       WHERE user_id = ? AND year = YEAR(CURDATE()) AND month = MONTH(CURDATE())`,
      [userId]
    );

    await connection.commit();
    next();
  } catch (err) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {}
    }
    console.error("checkUsageLimit error:", err);
    return res.status(500).json(errorFormat("server_error", "Usage check failed", 500));
  } finally {
    if (connection) {
      connection.release();
    }
  }
}
