import { Request, Response, NextFunction } from "express";
import { pgPool } from "../db/postgres";
import { logError } from "../utils/logger";

/**
 * Credit balance pre-check middleware.
 * - API key requests: checks api_credits balance, blocks if <= 0
 * - Firebase auth requests: passes through (subscription-based)
 * - DB errors: fail-closed (503) to prevent free usage on outage
 */
export function creditCheck(req: Request, res: Response, next: NextFunction) {
  const apiKeyId = (req as any).apiKeyId as number | undefined;
  if (!apiKeyId) return next(); // not an API key request

  pgPool
    .query<{ balance: number }>(
      `SELECT balance FROM api_credits WHERE api_key_id = $1 LIMIT 1`,
      [apiKeyId]
    )
    .then(({ rows }) => {
      if (rows.length === 0) {
        return next(); // no credit record → allow (legacy or unlimited plan)
      }
      const { balance } = rows[0];
      if (balance <= 0) {
        return res.status(402).json({ ok: false, error: "Insufficient credits" });
      }
      (req as any).creditBalance = balance;
      next();
    })
    .catch((err) => {
      logError("[credit-check] DB error:", err.message);
      return res.status(503).json({ ok: false, error: "Credit system unavailable" });
    });
}

/**
 * Deduct credit after AI usage (atomic transaction).
 */
export async function deductCredit(
  apiKeyId: number,
  workspaceId: number,
  amount: number,
  model?: string,
  description?: string
): Promise<void> {
  const client = await pgPool.connect();
  try {
    await client.query("BEGIN");

    await client.query(
      `INSERT INTO credit_transactions
        (api_key_id, workspace_id, amount, type, model, description, created_at)
       VALUES ($1, $2, $3, 'usage', $4, $5, NOW())`,
      [apiKeyId, workspaceId, -Math.abs(amount), model ?? null, description ?? null]
    );

    await client.query(
      `UPDATE api_credits
       SET balance = balance - $1, total_used = total_used + $1
       WHERE api_key_id = $2`,
      [Math.abs(amount), apiKeyId]
    );

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    logError("[credit-deduct] Transaction failed:", (err as Error).message);
    throw err;
  } finally {
    client.release();
  }
}
