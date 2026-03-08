/**
 * API Keys Router — Platform API Key CRUD + Test Playground
 *
 * 모든 엔드포인트: requireFirebaseAuth + withWorkspace 이후 마운트됨.
 * 마운트 경로: /platform
 */
import { Router, Request, Response } from "express";
import crypto from "crypto";
import { pgPool } from "../db/postgres";

const router = Router();

/* ──────────────────────────────────────────
   Helpers
────────────────────────────────────────── */

function getUserId(req: any): number | null {
  const raw = req.user?.userId ?? req.user?.id;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function getWorkspaceId(req: any): string | null {
  const ws = req.workspace?.id;
  return ws ? String(ws) : null;
}

/* ──────────────────────────────────────────
   1. POST /platform/keys — Create API key
────────────────────────────────────────── */
router.post("/keys", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const workspaceId = getWorkspaceId(req);
    if (!userId) return res.status(401).json({ ok: false, error: "unauthorized" });
    if (!workspaceId) return res.status(400).json({ ok: false, error: "workspace_required" });

    const { name } = req.body;
    if (!name || typeof name !== "string" || name.trim().length === 0 || name.length > 100) {
      return res.status(400).json({ ok: false, error: "name is required (max 100 chars)" });
    }

    // Generate key: yua_sk_<random 48 chars>
    const rawKey = `yua_sk_${crypto.randomBytes(24).toString("hex")}`;
    const keyPrefix = rawKey.slice(0, 12); // yua_sk_xxxxx
    const keyHash = crypto.createHash("sha256").update(rawKey).digest("hex");

    const result = await pgPool.query(
      `INSERT INTO platform_api_keys (workspace_id, user_id, name, key_prefix, key_hash, status)
       VALUES ($1, $2, $3, $4, $5, 'active')
       RETURNING id, name, key_prefix, status, created_at`,
      [workspaceId, userId, name.trim(), keyPrefix, keyHash]
    );

    // Return the full key ONLY on creation (never again)
    return res.json({
      ok: true,
      data: {
        key: rawKey, // Only shown once!
        ...result.rows[0],
      },
    });
  } catch (err: any) {
    console.error("[platform] POST /keys error:", err.message);
    return res.status(500).json({ ok: false, error: "Failed to create API key" });
  }
});

/* ──────────────────────────────────────────
   2. GET /platform/keys — List API keys
────────────────────────────────────────── */
router.get("/keys", async (req: Request, res: Response) => {
  try {
    const workspaceId = getWorkspaceId(req);
    if (!workspaceId) return res.status(400).json({ ok: false, error: "workspace_required" });

    const { rows } = await pgPool.query(
      `SELECT id, name, key_prefix, status, last_used_at, created_at, revoked_at
       FROM platform_api_keys
       WHERE workspace_id = $1
       ORDER BY created_at DESC`,
      [workspaceId]
    );

    return res.json({ ok: true, data: { keys: rows } });
  } catch (err: any) {
    console.error("[platform] GET /keys error:", err.message);
    return res.status(500).json({ ok: false, error: "Failed to fetch keys" });
  }
});

/* ──────────────────────────────────────────
   3. DELETE /platform/keys/:id — Revoke API key
────────────────────────────────────────── */
router.delete("/keys/:id", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const workspaceId = getWorkspaceId(req);
    if (!userId) return res.status(401).json({ ok: false, error: "unauthorized" });
    if (!workspaceId) return res.status(400).json({ ok: false, error: "workspace_required" });

    const keyId = parseInt(req.params.id);
    if (isNaN(keyId)) return res.status(400).json({ ok: false, error: "invalid key id" });

    const result = await pgPool.query(
      `UPDATE platform_api_keys
       SET status = 'revoked', revoked_at = NOW()
       WHERE id = $1 AND workspace_id = $2 AND status = 'active'
       RETURNING id`,
      [keyId, workspaceId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ ok: false, error: "Key not found or already revoked" });
    }

    return res.json({ ok: true });
  } catch (err: any) {
    console.error("[platform] DELETE /keys/:id error:", err.message);
    return res.status(500).json({ ok: false, error: "Failed to revoke key" });
  }
});

/* ──────────────────────────────────────────
   4. POST /platform/test — Test API call (proxy to /v1/chat/completions)
────────────────────────────────────────── */
router.post("/test", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ ok: false, error: "unauthorized" });

    const { message, model } = req.body;
    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ ok: false, error: "message is required" });
    }
    if (message.length > 1000) {
      return res.status(400).json({ ok: false, error: "message too long (max 1000)" });
    }

    const validModels = ["yua-basic", "yua-normal", "yua-pro"];
    const selectedModel = validModels.includes(model) ? model : "yua-basic";

    // Internal call to completions endpoint
    const startTime = Date.now();
    const completionRes = await fetch("http://127.0.0.1:4000/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: req.headers.authorization || "",
        "x-workspace-id": (req.headers["x-workspace-id"] as string) || "",
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: [{ role: "user", content: message.trim() }],
        stream: false,
      }),
    });
    const latency = Date.now() - startTime;

    const result = await completionRes.json();

    return res.json({
      ok: true,
      data: {
        response: result.choices?.[0]?.message?.content ?? "",
        model: selectedModel,
        latency,
        usage: result.usage,
        status: completionRes.status,
      },
    });
  } catch (err: any) {
    console.error("[platform] POST /test error:", err.message);
    return res.status(500).json({ ok: false, error: "API test failed" });
  }
});

export default router;
