// src/routes/admin-router.ts
// Admin API Router — 14 endpoints for yua-console

import { Router, Request, Response } from "express";
import { pgPool } from "../db/postgres";
import { mysqlPool } from "../db/mysql";
import { validateAdminSession } from "../middleware/admin-session";
import { requireRole } from "../middleware/admin-rbac";
import { logAdminAction } from "../middleware/admin-iam";
import { log, logError } from "../utils/logger";
import { SupportAIEngine } from "../support-ai/support-ai-engine";
import { SupportKnowledgeRepo } from "../support-ai/support-knowledge-repo";

export const adminRouter = Router();

// All admin routes require valid admin session
adminRouter.use(validateAdminSession);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function parsePagination(req: Request) {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

function clientIp(req: Request): string {
  return (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() || req.ip || "unknown";
}

// ---------------------------------------------------------------------------
// 1. GET /admin/users — list all users (MySQL)
// ---------------------------------------------------------------------------
adminRouter.get("/users", requireRole("admin"), async (req: Request, res: Response) => {
  try {
    const { page, limit, offset } = parsePagination(req);
    const search = (req.query.search as string) || "";

    let where = "";
    const params: any[] = [];
    if (search) {
      where = "WHERE email LIKE ? OR name LIKE ?";
      params.push(`%${search}%`, `%${search}%`);
    }

    const [[countRow]]: any = await mysqlPool.query(
      `SELECT COUNT(*) AS total FROM users ${where}`,
      params
    );
    const total = countRow?.total ?? 0;

    const [rows]: any = await mysqlPool.query(
      `SELECT id, firebase_uid, email, name, role, auth_provider, plan_id, created_at, last_login_at
       FROM users ${where}
       ORDER BY id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({ ok: true, data: { users: rows, total, page, limit } });
  } catch (err) {
    logError("[admin] GET /users error:", err);
    res.status(500).json({ ok: false, error: "Failed to fetch users" });
  }
});

// ---------------------------------------------------------------------------
// 2. GET /admin/users/:id — single user detail (MySQL)
// ---------------------------------------------------------------------------
adminRouter.get("/users/:id", requireRole("admin"), async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) return res.status(400).json({ ok: false, error: "Invalid user ID" });

    const [rows]: any = await mysqlPool.query(
      `SELECT id, firebase_uid, email, name, role, auth_provider, plan_id, created_at, last_login_at
       FROM users WHERE id = ? LIMIT 1`,
      [userId]
    );

    if (!rows.length) return res.status(404).json({ ok: false, error: "User not found" });

    // workspace memberships (PostgreSQL)
    const { rows: workspaces } = await pgPool.query(
      `SELECT w.id, w.name, wu.role, wu.joined_at
       FROM workspace_users wu
       JOIN workspaces w ON w.id = wu.workspace_id
       WHERE wu.user_id = $1
       ORDER BY wu.joined_at DESC`,
      [userId]
    );

    // thread count (PostgreSQL)
    const { rows: threadCount } = await pgPool.query(
      `SELECT COUNT(*)::text AS count FROM chat_threads WHERE user_id = $1`,
      [userId]
    );

    // P0-fix: recentThreads 반환 (최근 10개)
    const { rows: recentThreads } = await pgPool.query(
      `SELECT id, title, model, created_at
       FROM chat_threads
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 10`,
      [userId]
    );

    res.json({
      ok: true,
      data: {
        user: rows[0],
        workspaces,
        threadCount: parseInt(threadCount[0]?.count ?? "0"),
        recentThreads,
      },
    });
  } catch (err) {
    logError("[admin] GET /users/:id error:", err);
    res.status(500).json({ ok: false, error: "Failed to fetch user" });
  }
});

// ---------------------------------------------------------------------------
// 3. PATCH /admin/users/:id — update user (MySQL)
// ---------------------------------------------------------------------------
adminRouter.patch("/users/:id", requireRole("superadmin"), async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) return res.status(400).json({ ok: false, error: "Invalid user ID" });

    const { role, plan_id, is_banned } = req.body;

    // Get before state
    const [beforeRows]: any = await mysqlPool.query(
      `SELECT role, plan_id FROM users WHERE id = ? LIMIT 1`,
      [userId]
    );
    if (!beforeRows.length) return res.status(404).json({ ok: false, error: "User not found" });

    const updates: string[] = [];
    const params: any[] = [];

    const VALID_ROLES = ["user", "admin"];
    const VALID_PLANS = ["free", "premium", "developer", "developer_pro", "business", "business_premium", "enterprise", "enterprise_team", "enterprise_developer"];

    if (role !== undefined) {
      if (!VALID_ROLES.includes(role)) return res.status(400).json({ ok: false, error: "Invalid role" });
      updates.push("role = ?");
      params.push(role);
    }
    if (plan_id !== undefined) {
      if (!VALID_PLANS.includes(plan_id)) return res.status(400).json({ ok: false, error: "Invalid plan_id" });
      updates.push("plan_id = ?");
      params.push(plan_id);
    }
    if (is_banned !== undefined) {
      updates.push("is_banned = ?");
      params.push(is_banned ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({ ok: false, error: "No fields to update" });
    }

    params.push(userId);
    await mysqlPool.query(
      `UPDATE users SET ${updates.join(", ")} WHERE id = ?`,
      params
    );

    await logAdminAction(
      req.admin!.id,
      "update_user",
      "user",
      String(userId),
      JSON.stringify(beforeRows[0]),
      JSON.stringify({ role, plan_id, is_banned }),
      clientIp(req)
    );

    res.json({ ok: true, data: { userId, updated: { role, plan_id, is_banned } } });
  } catch (err) {
    logError("[admin] PATCH /users/:id error:", err);
    res.status(500).json({ ok: false, error: "Failed to update user" });
  }
});

// ---------------------------------------------------------------------------
// 4. GET /admin/stats — system stats
// ---------------------------------------------------------------------------
adminRouter.get("/stats", requireRole("viewer"), async (_req: Request, res: Response) => {
  try {
    // Total users (MySQL)
    const [[userCount]]: any = await mysqlPool.query("SELECT COUNT(*) AS total FROM users");

    // Active today (MySQL) — last_login_at within 24h
    const [[activeToday]]: any = await mysqlPool.query(
      "SELECT COUNT(*) AS total FROM users WHERE last_login_at >= NOW() - INTERVAL 1 DAY"
    );

    // Total threads (PostgreSQL)
    const { rows: threadCount } = await pgPool.query(
      "SELECT COUNT(*)::text AS total FROM chat_threads"
    );

    // Total messages (PostgreSQL)
    const { rows: msgCount } = await pgPool.query(
      "SELECT COUNT(*)::text AS total FROM chat_messages"
    );

    res.json({
      ok: true,
      data: {
        totalUsers: userCount?.total ?? 0,
        activeToday: activeToday?.total ?? 0,
        totalThreads: parseInt(threadCount[0]?.total ?? "0"),
        totalMessages: parseInt(msgCount[0]?.total ?? "0"),
      },
    });
  } catch (err) {
    logError("[admin] GET /stats error:", err);
    res.status(500).json({ ok: false, error: "Failed to fetch stats" });
  }
});

// ---------------------------------------------------------------------------
// 5. GET /admin/stats/revenue — revenue stats (PostgreSQL)
// ---------------------------------------------------------------------------
adminRouter.get("/stats/revenue", requireRole("billing_manager"), async (_req: Request, res: Response) => {
  try {
    // Subscriptions by plan
    const { rows: planStats } = await pgPool.query(
      `SELECT plan_id, status, COUNT(*)::text AS count
       FROM subscriptions
       GROUP BY plan_id, status
       ORDER BY plan_id`
    );

    // Credit usage totals
    const { rows: creditStats } = await pgPool.query(
      `SELECT
         COALESCE(SUM(total_purchased), 0) AS total_purchased,
         COALESCE(SUM(total_used), 0) AS total_used,
         COALESCE(SUM(balance), 0) AS total_balance
       FROM api_credits`
    );

    // Recent credit transactions (last 30 days)
    const { rows: recentTx } = await pgPool.query(
      `SELECT type, COUNT(*)::text AS count, COALESCE(SUM(ABS(amount)), 0) AS total_amount
       FROM credit_transactions
       WHERE created_at >= NOW() - INTERVAL '30 days'
       GROUP BY type`
    );

    res.json({
      ok: true,
      data: {
        subscriptions: planStats,
        credits: creditStats[0] ?? { total_purchased: 0, total_used: 0, total_balance: 0 },
        recentTransactions: recentTx,
      },
    });
  } catch (err) {
    logError("[admin] GET /stats/revenue error:", err);
    res.status(500).json({ ok: false, error: "Failed to fetch revenue stats" });
  }
});

// ---------------------------------------------------------------------------
// 6. GET /admin/workspaces — list workspaces (PostgreSQL)
// ---------------------------------------------------------------------------
adminRouter.get("/workspaces", requireRole("admin"), async (req: Request, res: Response) => {
  try {
    const { page, limit, offset } = parsePagination(req);
    const search = (req.query.search as string) || "";

    // P0-fix: search 파라미터 지원 (이름/slug 검색)
    const searchWhere = search
      ? "WHERE w.name ILIKE $1 OR w.slug ILIKE $1"
      : "";
    const searchParams = search ? [`%${search}%`] : [];
    const pIdx = searchParams.length + 1;

    const { rows: countRows } = await pgPool.query(
      `SELECT COUNT(*)::text AS total FROM workspaces w ${searchWhere}`,
      searchParams
    );
    const total = parseInt(countRows[0]?.total ?? "0");

    const { rows } = await pgPool.query(
      `SELECT id, name, slug, owner_id, plan_id, created_at,
              (SELECT COUNT(*) FROM workspace_users wu WHERE wu.workspace_id = w.id)::text AS member_count
       FROM workspaces w
       ${searchWhere}
       ORDER BY w.id DESC
       LIMIT $${pIdx} OFFSET $${pIdx + 1}`,
      [...searchParams, limit, offset]
    );

    res.json({ ok: true, data: { workspaces: rows, total, page, limit } });
  } catch (err) {
    logError("[admin] GET /workspaces error:", err);
    res.status(500).json({ ok: false, error: "Failed to fetch workspaces" });
  }
});

// ---------------------------------------------------------------------------
// 7. GET /admin/workspaces/:id — workspace detail (PostgreSQL)
// ---------------------------------------------------------------------------
adminRouter.get("/workspaces/:id", requireRole("admin"), async (req: Request, res: Response) => {
  try {
    const wsId = parseInt(req.params.id);
    if (isNaN(wsId)) return res.status(400).json({ ok: false, error: "Invalid workspace ID" });

    const { rows: wsRows } = await pgPool.query(
      `SELECT * FROM workspaces WHERE id = $1 LIMIT 1`,
      [wsId]
    );
    if (!wsRows.length) return res.status(404).json({ ok: false, error: "Workspace not found" });

    const { rows: members } = await pgPool.query(
      `SELECT wu.user_id, wu.role, wu.joined_at
       FROM workspace_users wu
       WHERE wu.workspace_id = $1
       ORDER BY wu.joined_at`,
      [wsId]
    );

    // Enrich with user info from MySQL
    const userIds = members.map((m: any) => m.user_id);
    let userMap: Record<number, any> = {};
    if (userIds.length > 0) {
      const placeholders = userIds.map(() => "?").join(",");
      const [userRows]: any = await mysqlPool.query(
        `SELECT id, email, name FROM users WHERE id IN (${placeholders})`,
        userIds
      );
      for (const u of userRows) {
        userMap[u.id] = u;
      }
    }

    const enrichedMembers = members.map((m: any) => ({
      ...m,
      email: userMap[m.user_id]?.email ?? null,
      name: userMap[m.user_id]?.name ?? null,
    }));

    res.json({
      ok: true,
      data: { workspace: wsRows[0], members: enrichedMembers },
    });
  } catch (err) {
    logError("[admin] GET /workspaces/:id error:", err);
    res.status(500).json({ ok: false, error: "Failed to fetch workspace" });
  }
});

// ---------------------------------------------------------------------------
// 8. GET /admin/threads — recent threads (PostgreSQL)
// ---------------------------------------------------------------------------
adminRouter.get("/threads", requireRole("support"), async (req: Request, res: Response) => {
  try {
    const { page, limit, offset } = parsePagination(req);
    const userId = req.query.user_id ? parseInt(req.query.user_id as string) : null;

    let where = "";
    const params: any[] = [];
    let paramIdx = 1;

    if (userId) {
      where = `WHERE user_id = $${paramIdx++}`;
      params.push(userId);
    }

    const { rows: countRows } = await pgPool.query(
      `SELECT COUNT(*)::text AS total FROM chat_threads ${where}`,
      params
    );
    const total = parseInt(countRows[0]?.total ?? "0");

    const { rows } = await pgPool.query(
      `SELECT id, user_id, workspace_id, title, model, created_at, updated_at
       FROM chat_threads ${where}
       ORDER BY updated_at DESC
       LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      [...params, limit, offset]
    );

    res.json({ ok: true, data: { threads: rows, total, page, limit } });
  } catch (err) {
    logError("[admin] GET /threads error:", err);
    res.status(500).json({ ok: false, error: "Failed to fetch threads" });
  }
});

// ---------------------------------------------------------------------------
// 9. GET /admin/threads/:id/messages — thread messages (PostgreSQL)
// ---------------------------------------------------------------------------
adminRouter.get("/threads/:id/messages", requireRole("support"), async (req: Request, res: Response) => {
  try {
    const threadId = parseInt(req.params.id);
    if (isNaN(threadId)) return res.status(400).json({ ok: false, error: "Invalid thread ID" });

    const { page, limit, offset } = parsePagination(req);

    const { rows: countRows } = await pgPool.query(
      `SELECT COUNT(*)::text AS total FROM chat_messages WHERE thread_id = $1`,
      [threadId]
    );
    const total = parseInt(countRows[0]?.total ?? "0");

    const { rows } = await pgPool.query(
      `SELECT id, thread_id, role, content, model, token_count, created_at
       FROM chat_messages
       WHERE thread_id = $1
       ORDER BY created_at ASC
       LIMIT $2 OFFSET $3`,
      [threadId, limit, offset]
    );

    res.json({ ok: true, data: { messages: rows, total, page, limit } });
  } catch (err) {
    logError("[admin] GET /threads/:id/messages error:", err);
    res.status(500).json({ ok: false, error: "Failed to fetch messages" });
  }
});

// ---------------------------------------------------------------------------
// 10. GET /admin/tickets — support tickets (PostgreSQL)
// ---------------------------------------------------------------------------
adminRouter.get("/tickets", requireRole("support"), async (req: Request, res: Response) => {
  try {
    const { page, limit, offset } = parsePagination(req);
    const status = req.query.status as string | undefined;
    const priority = req.query.priority as string | undefined;

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    if (status) {
      conditions.push(`status = $${paramIdx++}`);
      params.push(status);
    }
    if (priority) {
      conditions.push(`priority = $${paramIdx++}`);
      params.push(priority);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const { rows: countRows } = await pgPool.query(
      `SELECT COUNT(*)::text AS total FROM support_tickets ${where}`,
      params
    );
    const total = parseInt(countRows[0]?.total ?? "0");

    const { rows } = await pgPool.query(
      `SELECT id, workspace_id, user_id, subject, category, priority, status,
              assigned_admin_id, created_at, updated_at, resolved_at
       FROM support_tickets ${where}
       ORDER BY
         CASE priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
         created_at DESC
       LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      [...params, limit, offset]
    );

    res.json({ ok: true, data: { tickets: rows, total, page, limit } });
  } catch (err) {
    logError("[admin] GET /tickets error:", err);
    res.status(500).json({ ok: false, error: "Failed to fetch tickets" });
  }
});

// ---------------------------------------------------------------------------
// 11. POST /admin/tickets/:id/reply — admin reply to ticket
// ---------------------------------------------------------------------------
adminRouter.post("/tickets/:id/reply", requireRole("support"), async (req: Request, res: Response) => {
  try {
    const ticketId = parseInt(req.params.id);
    if (isNaN(ticketId)) return res.status(400).json({ ok: false, error: "Invalid ticket ID" });

    const { content } = req.body;
    if (!content || typeof content !== "string" || !content.trim()) {
      return res.status(400).json({ ok: false, error: "Content is required" });
    }
    if (content.length > 50000) {
      return res.status(400).json({ ok: false, error: "Content too long (max 50000)" });
    }

    // Verify ticket exists
    const { rows: ticketRows } = await pgPool.query(
      "SELECT id, status FROM support_tickets WHERE id = $1",
      [ticketId]
    );
    if (!ticketRows.length) return res.status(404).json({ ok: false, error: "Ticket not found" });

    // Insert message
    const { rows: msgRows } = await pgPool.query(
      `INSERT INTO ticket_messages (ticket_id, sender_type, sender_id, content, created_at)
       VALUES ($1, 'admin', $2, $3, NOW())
       RETURNING id, created_at`,
      [ticketId, req.admin!.id, content.trim()]
    );

    // Update ticket updated_at and set to in_progress if open
    await pgPool.query(
      `UPDATE support_tickets
       SET updated_at = NOW(),
           status = CASE WHEN status = 'open' THEN 'in_progress' ELSE status END
       WHERE id = $1`,
      [ticketId]
    );

    await logAdminAction(
      req.admin!.id,
      "ticket_reply",
      "ticket",
      String(ticketId),
      null,
      JSON.stringify({ messageId: msgRows[0].id }),
      clientIp(req)
    );

    res.json({ ok: true, data: { messageId: msgRows[0].id, createdAt: msgRows[0].created_at } });
  } catch (err) {
    logError("[admin] POST /tickets/:id/reply error:", err);
    res.status(500).json({ ok: false, error: "Failed to reply to ticket" });
  }
});

// ---------------------------------------------------------------------------
// 12. PATCH /admin/tickets/:id — update ticket
// ---------------------------------------------------------------------------
adminRouter.patch("/tickets/:id", requireRole("support"), async (req: Request, res: Response) => {
  try {
    const ticketId = parseInt(req.params.id);
    if (isNaN(ticketId)) return res.status(400).json({ ok: false, error: "Invalid ticket ID" });

    const { status, priority, category, assigned_admin_id } = req.body;

    // Get before state
    const { rows: beforeRows } = await pgPool.query(
      "SELECT status, priority, category, assigned_admin_id FROM support_tickets WHERE id = $1",
      [ticketId]
    );
    if (!beforeRows.length) return res.status(404).json({ ok: false, error: "Ticket not found" });

    const sets: string[] = ["updated_at = NOW()"];
    const params: any[] = [];
    let paramIdx = 1;

    const VALID_STATUSES = ["open", "in_progress", "waiting_user", "resolved", "closed"];
    const VALID_PRIORITIES = ["low", "medium", "high", "urgent"];
    const VALID_CATEGORIES = ["bug", "billing", "account", "feature", "general"];

    if (status !== undefined) {
      if (!VALID_STATUSES.includes(status)) return res.status(400).json({ ok: false, error: "Invalid status" });
      sets.push(`status = $${paramIdx++}`);
      params.push(status);
      if (status === "resolved" || status === "closed") {
        sets.push(`resolved_at = NOW()`);
      }
    }
    if (priority !== undefined) {
      if (!VALID_PRIORITIES.includes(priority)) return res.status(400).json({ ok: false, error: "Invalid priority" });
      sets.push(`priority = $${paramIdx++}`);
      params.push(priority);
    }
    if (category !== undefined) {
      if (!VALID_CATEGORIES.includes(category)) return res.status(400).json({ ok: false, error: "Invalid category" });
      sets.push(`category = $${paramIdx++}`);
      params.push(category);
    }
    if (assigned_admin_id !== undefined) {
      sets.push(`assigned_admin_id = $${paramIdx++}`);
      params.push(assigned_admin_id);
    }

    params.push(ticketId);
    await pgPool.query(
      `UPDATE support_tickets SET ${sets.join(", ")} WHERE id = $${paramIdx}`,
      params
    );

    await logAdminAction(
      req.admin!.id,
      "update_ticket",
      "ticket",
      String(ticketId),
      JSON.stringify(beforeRows[0]),
      JSON.stringify({ status, priority, category, assigned_admin_id }),
      clientIp(req)
    );

    res.json({ ok: true, data: { ticketId, updated: { status, priority, category, assigned_admin_id } } });
  } catch (err) {
    logError("[admin] PATCH /tickets/:id error:", err);
    res.status(500).json({ ok: false, error: "Failed to update ticket" });
  }
});

// ---------------------------------------------------------------------------
// 13. GET /admin/audit — audit log list (PostgreSQL)
// ---------------------------------------------------------------------------
adminRouter.get("/audit", requireRole("superadmin"), async (req: Request, res: Response) => {
  try {
    const { page, limit, offset } = parsePagination(req);
    const adminId = req.query.admin_id ? parseInt(req.query.admin_id as string) : null;
    const adminSearch = (req.query.admin as string) || "";
    const action = req.query.action as string | undefined;

    const conditions: string[] = [];
    const params: any[] = [];
    let paramIdx = 1;

    if (adminId) {
      conditions.push(`a.admin_id = $${paramIdx++}`);
      params.push(adminId);
    } else if (adminSearch) {
      // P0-fix: 프론트가 admin 파라미터로 이름/이메일 텍스트 검색
      conditions.push(`(u.email ILIKE $${paramIdx} OR u.name ILIKE $${paramIdx})`);
      params.push(`%${adminSearch}%`);
      paramIdx++;
    }
    if (action) {
      conditions.push(`a.action = $${paramIdx++}`);
      params.push(action);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const countJoin = adminSearch
      ? "JOIN admin_users u ON u.id = a.admin_id"
      : "";
    const { rows: countRows } = await pgPool.query(
      `SELECT COUNT(*)::text AS total FROM admin_audit_logs a ${countJoin} ${where}`,
      params
    );
    const total = parseInt(countRows[0]?.total ?? "0");

    const { rows } = await pgPool.query(
      `SELECT a.id, a.admin_id, u.email AS admin_email, u.name AS admin_name,
              a.action, a.target_type, a.target_id,
              a.before_value, a.after_value, a.ip_address, a.created_at
       FROM admin_audit_logs a
       JOIN admin_users u ON u.id = a.admin_id
       ${where}
       ORDER BY a.created_at DESC
       LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      [...params, limit, offset]
    );

    res.json({ ok: true, data: { logs: rows, total, page, limit } });
  } catch (err) {
    logError("[admin] GET /audit error:", err);
    res.status(500).json({ ok: false, error: "Failed to fetch audit logs" });
  }
});

// ---------------------------------------------------------------------------
// 14. GET /admin/monitor/stream — SSE real-time system metrics
// ---------------------------------------------------------------------------
adminRouter.get("/monitor/stream", requireRole("admin"), async (req: Request, res: Response) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });

  const sendEvent = (event: string, data: any) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  sendEvent("connected", { time: new Date().toISOString() });

  const interval = setInterval(async () => {
    try {
      // System metrics snapshot
      const memUsage = process.memoryUsage();

      // Active sessions count
      const { rows: sessionCount } = await pgPool.query(
        "SELECT COUNT(*)::text AS count FROM admin_sessions WHERE expires_at > NOW()"
      );

      // Recent threads (last hour)
      const { rows: recentThreads } = await pgPool.query(
        "SELECT COUNT(*)::text AS count FROM chat_threads WHERE created_at >= NOW() - INTERVAL '1 hour'"
      );

      // Recent messages (last hour)
      const { rows: recentMsgs } = await pgPool.query(
        "SELECT COUNT(*)::text AS count FROM chat_messages WHERE created_at >= NOW() - INTERVAL '1 hour'"
      );

      // Open tickets
      const { rows: openTickets } = await pgPool.query(
        "SELECT COUNT(*)::text AS count FROM support_tickets WHERE status IN ('open', 'in_progress')"
      );

      sendEvent("metrics", {
        timestamp: new Date().toISOString(),
        memory: {
          heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
          heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
          rss: Math.round(memUsage.rss / 1024 / 1024),
        },
        activeSessions: parseInt(sessionCount[0]?.count ?? "0"),
        threadsLastHour: parseInt(recentThreads[0]?.count ?? "0"),
        messagesLastHour: parseInt(recentMsgs[0]?.count ?? "0"),
        openTickets: parseInt(openTickets[0]?.count ?? "0"),
      });
    } catch (err) {
      logError("[admin] SSE metrics error:", err);
    }
  }, 10000); // every 10 seconds

  // Keep-alive ping
  const pingInterval = setInterval(() => {
    res.write(": ping\n\n");
  }, 30000);

  req.on("close", () => {
    clearInterval(interval);
    clearInterval(pingInterval);
    log("[admin] SSE monitor stream closed");
  });
});

// ---------------------------------------------------------------------------
// 15. POST /admin/tickets/:id/ai-draft — Generate AI draft reply
// ---------------------------------------------------------------------------
adminRouter.post("/tickets/:id/ai-draft", requireRole("support"), async (req: Request, res: Response) => {
  try {
    const ticketId = parseInt(req.params.id);
    if (isNaN(ticketId)) return res.status(400).json({ ok: false, error: "Invalid ticket ID" });

    const result = await SupportAIEngine.generateDraft(ticketId);
    if (!result.ok) {
      return res.status(500).json({ ok: false, error: "AI draft generation failed" });
    }

    await logAdminAction(
      req.admin!.id, "ai_draft", "ticket", String(ticketId),
      null, JSON.stringify({ draft: result.draft?.slice(0, 100) }), clientIp(req)
    );

    res.json({ ok: true, data: { draft: result.draft, sources: result.sources } });
  } catch (err) {
    logError("[admin] POST /tickets/:id/ai-draft error:", err);
    res.status(500).json({ ok: false, error: "Failed to generate AI draft" });
  }
});

// ---------------------------------------------------------------------------
// 16. POST /admin/tickets/:id/approve-draft — Approve AI draft
// ---------------------------------------------------------------------------
adminRouter.post("/tickets/:id/approve-draft", requireRole("support"), async (req: Request, res: Response) => {
  try {
    const ticketId = parseInt(req.params.id);
    if (isNaN(ticketId)) return res.status(400).json({ ok: false, error: "Invalid ticket ID" });

    const { messageId } = req.body;
    if (!messageId || typeof messageId !== "number") {
      return res.status(400).json({ ok: false, error: "messageId is required" });
    }

    const result = await SupportAIEngine.approveDraft(ticketId, messageId, req.admin!.id);
    if (!result.ok) {
      return res.status(404).json({ ok: false, error: "Draft not found or already approved" });
    }

    await logAdminAction(
      req.admin!.id, "approve_ai_draft", "ticket_message", String(messageId),
      null, null, clientIp(req)
    );

    res.json({ ok: true });
  } catch (err) {
    logError("[admin] POST /tickets/:id/approve-draft error:", err);
    res.status(500).json({ ok: false, error: "Failed to approve draft" });
  }
});

// ---------------------------------------------------------------------------
// 17. POST /admin/tickets/:id/classify — Auto-classify ticket
// ---------------------------------------------------------------------------
adminRouter.post("/tickets/:id/classify", requireRole("support"), async (req: Request, res: Response) => {
  try {
    const ticketId = parseInt(req.params.id);
    if (isNaN(ticketId)) return res.status(400).json({ ok: false, error: "Invalid ticket ID" });

    const result = await SupportAIEngine.classifyTicket(ticketId);
    if (!result.ok) {
      return res.status(500).json({ ok: false, error: "Classification failed" });
    }

    await logAdminAction(
      req.admin!.id, "classify_ticket", "ticket", String(ticketId),
      null, JSON.stringify(result), clientIp(req)
    );

    res.json({ ok: true, data: { category: result.category, priority: result.priority, confidence: result.confidence } });
  } catch (err) {
    logError("[admin] POST /tickets/:id/classify error:", err);
    res.status(500).json({ ok: false, error: "Failed to classify ticket" });
  }
});

// ---------------------------------------------------------------------------
// 18. GET /admin/tickets/:id/messages — Get ticket messages
// ---------------------------------------------------------------------------
adminRouter.get("/tickets/:id/messages", requireRole("support"), async (req: Request, res: Response) => {
  try {
    const ticketId = parseInt(req.params.id);
    if (isNaN(ticketId)) return res.status(400).json({ ok: false, error: "Invalid ticket ID" });

    const { rows } = await pgPool.query(
      `SELECT id, ticket_id, sender_type, sender_id, content, is_ai_draft, approved_by, created_at
       FROM ticket_messages
       WHERE ticket_id = $1
       ORDER BY created_at ASC`,
      [ticketId]
    );

    res.json({ ok: true, data: { messages: rows } });
  } catch (err) {
    logError("[admin] GET /tickets/:id/messages error:", err);
    res.status(500).json({ ok: false, error: "Failed to fetch messages" });
  }
});

// ---------------------------------------------------------------------------
// 19. GET /admin/knowledge — List knowledge base entries
// ---------------------------------------------------------------------------
adminRouter.get("/knowledge", requireRole("support"), async (req: Request, res: Response) => {
  try {
    const { page, limit, offset } = parsePagination(req);
    const category = req.query.category as string | undefined;

    const result = await SupportKnowledgeRepo.list(category, page, limit);
    res.json({ ok: true, data: result });
  } catch (err) {
    logError("[admin] GET /knowledge error:", err);
    res.status(500).json({ ok: false, error: "Failed to fetch knowledge base" });
  }
});

// ---------------------------------------------------------------------------
// 20. POST /admin/knowledge — Create knowledge entry
// ---------------------------------------------------------------------------
adminRouter.post("/knowledge", requireRole("admin"), async (req: Request, res: Response) => {
  try {
    const { category, question, answer } = req.body;
    if (!question || !answer) {
      return res.status(400).json({ ok: false, error: "question and answer are required" });
    }
    if (typeof question !== "string" || question.length > 5000) {
      return res.status(400).json({ ok: false, error: "question too long (max 5000)" });
    }
    if (typeof answer !== "string" || answer.length > 20000) {
      return res.status(400).json({ ok: false, error: "answer too long (max 20000)" });
    }
    const VALID_KB_CATEGORIES = ["general", "bug", "billing", "account", "feature"];
    const safeCategory = VALID_KB_CATEGORIES.includes(category) ? category : "general";

    const entry = await SupportKnowledgeRepo.create({
      category: safeCategory,
      question,
      answer,
      created_by: req.admin!.id,
    });

    await logAdminAction(
      req.admin!.id, "create_knowledge", "knowledge", String(entry.id),
      null, JSON.stringify({ category, question: question.slice(0, 100) }), clientIp(req)
    );

    res.json({ ok: true, data: { entry } });
  } catch (err) {
    logError("[admin] POST /knowledge error:", err);
    res.status(500).json({ ok: false, error: "Failed to create knowledge entry" });
  }
});

// ---------------------------------------------------------------------------
// 21. PATCH /admin/knowledge/:id — Update knowledge entry
// ---------------------------------------------------------------------------
adminRouter.patch("/knowledge/:id", requireRole("admin"), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ ok: false, error: "Invalid ID" });

    const { category, question, answer, is_active } = req.body;
    const updated = await SupportKnowledgeRepo.update(id, { category, question, answer, is_active });

    if (!updated) return res.status(404).json({ ok: false, error: "Entry not found" });

    await logAdminAction(
      req.admin!.id, "update_knowledge", "knowledge", String(id),
      null, JSON.stringify({ category, question: question?.slice(0, 100) }), clientIp(req)
    );

    res.json({ ok: true, data: { entry: updated } });
  } catch (err) {
    logError("[admin] PATCH /knowledge/:id error:", err);
    res.status(500).json({ ok: false, error: "Failed to update knowledge entry" });
  }
});

// ---------------------------------------------------------------------------
// 22. DELETE /admin/knowledge/:id — Soft-delete knowledge entry
// ---------------------------------------------------------------------------
adminRouter.delete("/knowledge/:id", requireRole("admin"), async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ ok: false, error: "Invalid ID" });

    const deleted = await SupportKnowledgeRepo.softDelete(id);
    if (!deleted) return res.status(404).json({ ok: false, error: "Entry not found" });

    await logAdminAction(
      req.admin!.id, "delete_knowledge", "knowledge", String(id),
      null, null, clientIp(req)
    );

    res.json({ ok: true });
  } catch (err) {
    logError("[admin] DELETE /knowledge/:id error:", err);
    res.status(500).json({ ok: false, error: "Failed to delete knowledge entry" });
  }
});

// ---------------------------------------------------------------------------
// 23. GET /admin/stats/revenue/daily — Daily revenue chart data
// ---------------------------------------------------------------------------
adminRouter.get("/stats/revenue/daily", requireRole("billing_manager"), async (req: Request, res: Response) => {
  try {
    const days = Math.min(90, Math.max(7, parseInt(req.query.days as string) || 30));

    const { rows } = await pgPool.query(
      `SELECT DATE(created_at) as date,
              SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) as revenue,
              COUNT(*) as tx_count
       FROM credit_transactions
       WHERE type = 'purchase' AND created_at >= NOW() - INTERVAL '1 day' * $1
       GROUP BY DATE(created_at)
       ORDER BY date ASC`,
      [days]
    );

    res.json({ ok: true, data: { daily: rows, days } });
  } catch (err) {
    logError("[admin] GET /stats/revenue/daily error:", err);
    res.status(500).json({ ok: false, error: "Failed to fetch daily revenue" });
  }
});

// ---------------------------------------------------------------------------
// 24. GET /admin/stats/customers — Customer overview stats
// ---------------------------------------------------------------------------
adminRouter.get("/stats/customers", requireRole("admin"), async (req: Request, res: Response) => {
  try {
    // User growth by month (MySQL)
    const [monthlyGrowth]: any = await mysqlPool.query(
      `SELECT DATE_FORMAT(created_at, '%Y-%m') as month, COUNT(*) as new_users
       FROM users
       GROUP BY DATE_FORMAT(created_at, '%Y-%m')
       ORDER BY month DESC
       LIMIT 12`
    );

    // Plan distribution (MySQL)
    const [planDist]: any = await mysqlPool.query(
      `SELECT COALESCE(plan_id, 'free') as plan, COUNT(*) as count
       FROM users GROUP BY plan_id`
    );

    // Auth provider distribution (MySQL)
    const [authDist]: any = await mysqlPool.query(
      `SELECT COALESCE(auth_provider, 'unknown') as provider, COUNT(*) as count
       FROM users GROUP BY auth_provider`
    );

    // Active users (last 7/30 days) (MySQL)
    const [[active7]]: any = await mysqlPool.query(
      `SELECT COUNT(*) as count FROM users WHERE updated_at >= NOW() - INTERVAL 7 DAY`
    );
    const [[active30]]: any = await mysqlPool.query(
      `SELECT COUNT(*) as count FROM users WHERE updated_at >= NOW() - INTERVAL 30 DAY`
    );
    const [[totalUsers]]: any = await mysqlPool.query(`SELECT COUNT(*) as count FROM users`);

    res.json({
      ok: true,
      data: {
        totalUsers: totalUsers?.count ?? 0,
        active7d: active7?.count ?? 0,
        active30d: active30?.count ?? 0,
        monthlyGrowth,
        planDistribution: planDist,
        authDistribution: authDist,
      },
    });
  } catch (err) {
    logError("[admin] GET /stats/customers error:", err);
    res.status(500).json({ ok: false, error: "Failed to fetch customer stats" });
  }
});

// ---------------------------------------------------------------------------
// 25. GET /admin/customers — Customer list with search/filter
// ---------------------------------------------------------------------------
adminRouter.get("/customers", requireRole("admin"), async (req: Request, res: Response) => {
  try {
    const { page, limit, offset } = parsePagination(req);
    const search = (req.query.search as string) || "";
    const planFilter = (req.query.plan as string) || "";
    const sortBy = (req.query.sort as string) || "created_at";
    const sortDir = (req.query.dir as string) === "asc" ? "ASC" : "DESC";

    const validSorts = ["created_at", "updated_at", "name", "email", "plan_id"];
    const sort = validSorts.includes(sortBy) ? sortBy : "created_at";

    const conditions: string[] = [];
    const params: any[] = [];

    if (search) {
      conditions.push("(email LIKE ? OR name LIKE ?)");
      params.push(`%${search}%`, `%${search}%`);
    }
    if (planFilter) {
      conditions.push("plan_id = ?");
      params.push(planFilter);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const [[countRow]]: any = await mysqlPool.query(
      `SELECT COUNT(*) AS total FROM users ${where}`, params
    );

    const [rows]: any = await mysqlPool.query(
      `SELECT id, email, name, plan_id, role, auth_provider, credits,
              daily_usage, monthly_usage, created_at, updated_at
       FROM users ${where}
       ORDER BY ${sort} ${sortDir}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    res.json({ ok: true, data: { customers: rows, total: countRow?.total ?? 0, page, limit } });
  } catch (err) {
    logError("[admin] GET /customers error:", err);
    res.status(500).json({ ok: false, error: "Failed to fetch customers" });
  }
});
