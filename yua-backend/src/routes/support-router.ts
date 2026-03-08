import { Router, Request, Response } from "express";
import { pgPool } from "../db/postgres";

const router = Router();

// All endpoints assume requireFirebaseAuth + withWorkspace middleware applied at mount point

function getUserId(req: any): number | null {
  const raw = req.user?.userId ?? req.user?.id;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function getWorkspaceId(req: any): string | null {
  const ws = req.workspace?.id;
  return ws ? String(ws) : null;
}

// 1. POST /support/tickets — Create a new ticket
router.post("/tickets", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const workspaceId = getWorkspaceId(req);
    if (!userId) return res.status(401).json({ ok: false, error: "unauthorized" });
    if (!workspaceId) return res.status(400).json({ ok: false, error: "workspace_required" });

    const { subject, category, content } = req.body;
    if (!subject || typeof subject !== "string" || !subject.trim()) {
      return res.status(400).json({ ok: false, error: "subject is required" });
    }
    if (!content || typeof content !== "string" || !content.trim()) {
      return res.status(400).json({ ok: false, error: "content is required" });
    }
    if (subject.length > 500) {
      return res.status(400).json({ ok: false, error: "subject too long (max 500)" });
    }
    if (content.length > 10000) {
      return res.status(400).json({ ok: false, error: "content too long (max 10000)" });
    }

    const validCategories = ["bug", "billing", "account", "feature", "general"];
    const cat = validCategories.includes(category) ? category : "general";

    const client = await pgPool.connect();
    try {
      await client.query("BEGIN");

      // Insert ticket
      const ticketResult = await client.query(
        `INSERT INTO support_tickets (workspace_id, user_id, subject, category, priority, status)
         VALUES ($1, $2, $3, $4, 'medium', 'open')
         RETURNING id, workspace_id, user_id, subject, category, priority, status, created_at`,
        [workspaceId, userId, subject.trim(), cat]
      );
      const ticket = ticketResult.rows[0];

      // Insert first message
      await client.query(
        `INSERT INTO ticket_messages (ticket_id, sender_type, sender_id, content)
         VALUES ($1, 'user', $2, $3)`,
        [ticket.id, userId, content.trim()]
      );

      await client.query("COMMIT");
      return res.json({ ok: true, data: { ticket } });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error("[support] POST /tickets error:", err.message);
    return res.status(500).json({ ok: false, error: "Failed to create ticket" });
  }
});

// 2. GET /support/tickets — List user's tickets
router.get("/tickets", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ ok: false, error: "unauthorized" });

    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 10));
    const offset = (page - 1) * limit;

    const [dataResult, countResult] = await Promise.all([
      pgPool.query(
        `SELECT id, subject, category, priority, status, created_at, updated_at, resolved_at
         FROM support_tickets
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      ),
      pgPool.query(
        `SELECT COUNT(*)::int AS total FROM support_tickets WHERE user_id = $1`,
        [userId]
      ),
    ]);

    return res.json({
      ok: true,
      data: {
        tickets: dataResult.rows,
        total: countResult.rows[0]?.total ?? 0,
        page,
        limit,
      },
    });
  } catch (err: any) {
    console.error("[support] GET /tickets error:", err.message);
    return res.status(500).json({ ok: false, error: "Failed to fetch tickets" });
  }
});

// 3. GET /support/tickets/:id — Get ticket detail with messages
router.get("/tickets/:id", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ ok: false, error: "unauthorized" });

    const ticketId = parseInt(req.params.id);
    if (isNaN(ticketId)) return res.status(400).json({ ok: false, error: "invalid ticket id" });

    // Only allow viewing own tickets
    const ticketResult = await pgPool.query(
      `SELECT id, subject, category, priority, status, created_at, updated_at, resolved_at
       FROM support_tickets
       WHERE id = $1 AND user_id = $2`,
      [ticketId, userId]
    );

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "ticket not found" });
    }

    const messagesResult = await pgPool.query(
      `SELECT id, sender_type, content, created_at
       FROM ticket_messages
       WHERE ticket_id = $1
       ORDER BY created_at ASC`,
      [ticketId]
    );

    // Filter out: don't show AI drafts that haven't been approved
    const messages = messagesResult.rows.filter((m: any) => {
      if (m.sender_type === "ai") return false; // users don't see AI drafts
      return true;
    });

    return res.json({
      ok: true,
      data: {
        ticket: ticketResult.rows[0],
        messages,
      },
    });
  } catch (err: any) {
    console.error("[support] GET /tickets/:id error:", err.message);
    return res.status(500).json({ ok: false, error: "Failed to fetch ticket" });
  }
});

// 4. POST /support/tickets/:id/messages — Add message to ticket
router.post("/tickets/:id/messages", async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ ok: false, error: "unauthorized" });

    const ticketId = parseInt(req.params.id);
    if (isNaN(ticketId)) return res.status(400).json({ ok: false, error: "invalid ticket id" });

    const { content } = req.body;
    if (!content || typeof content !== "string" || !content.trim()) {
      return res.status(400).json({ ok: false, error: "content is required" });
    }
    if (content.length > 10000) {
      return res.status(400).json({ ok: false, error: "content too long (max 10000)" });
    }

    // Verify ticket belongs to user and is not closed
    const ticketResult = await pgPool.query(
      `SELECT id, status FROM support_tickets WHERE id = $1 AND user_id = $2`,
      [ticketId, userId]
    );

    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ ok: false, error: "ticket not found" });
    }

    if (ticketResult.rows[0].status === "closed") {
      return res.status(400).json({ ok: false, error: "ticket is closed" });
    }

    // Insert message
    const msgResult = await pgPool.query(
      `INSERT INTO ticket_messages (ticket_id, sender_type, sender_id, content)
       VALUES ($1, 'user', $2, $3)
       RETURNING id, sender_type, content, created_at`,
      [ticketId, userId, content.trim()]
    );

    // Update ticket timestamp and set back to open if it was waiting_user
    await pgPool.query(
      `UPDATE support_tickets
       SET updated_at = NOW(),
           status = CASE WHEN status = 'waiting_user' THEN 'open' ELSE status END
       WHERE id = $1`,
      [ticketId]
    );

    return res.json({ ok: true, data: { message: msgResult.rows[0] } });
  } catch (err: any) {
    console.error("[support] POST /tickets/:id/messages error:", err.message);
    return res.status(500).json({ ok: false, error: "Failed to send message" });
  }
});

export default router;
