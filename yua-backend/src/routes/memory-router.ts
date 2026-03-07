// Memory CRUD API Router
// Provides list, summary, update, and soft-delete for memory_records

import { Router } from "express";
import { pgPool } from "../db/postgres";

const router = Router();

const VALID_SCOPES = new Set([
  "user_profile",
  "user_preference",
  "user_research",
  "project_architecture",
  "project_decision",
  "general_knowledge",
]);

const VALID_SORT_BY = new Set([
  "confidence",
  "updated_at",
  "created_at",
  "access_count",
]);

/* =========================
   GET /api/memory/list
   Query: ?scope=user_profile&limit=20&sortBy=updated_at&sortOrder=desc&minConfidence=0&q=&offset=0
========================= */
router.get("/list", async (req: any, res) => {
  try {
    const workspaceId = req.workspace?.id;
    if (!workspaceId) return res.status(400).json({ ok: false, error: "workspace_required" });

    const scope = req.query.scope as string | undefined;
    if (scope && !VALID_SCOPES.has(scope)) {
      return res.status(400).json({ ok: false, error: "invalid_scope" });
    }

    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const sortBy = VALID_SORT_BY.has(req.query.sortBy) ? req.query.sortBy : "updated_at";
    const sortOrder = req.query.sortOrder === "asc" ? "ASC" : "DESC";
    const minConfidence = Math.max(Number(req.query.minConfidence) || 0, 0);
    const searchQuery = typeof req.query.q === "string" ? req.query.q.trim() : "";

    const conditions = ["workspace_id = $1", "is_active = true"];
    const values: any[] = [workspaceId];
    let paramIdx = 2;

    if (scope) {
      conditions.push(`scope = $${paramIdx++}`);
      values.push(scope);
    }
    if (minConfidence > 0) {
      conditions.push(`confidence >= $${paramIdx++}`);
      values.push(minConfidence);
    }
    if (searchQuery) {
      conditions.push(`content ILIKE $${paramIdx++}`);
      values.push(`%${searchQuery}%`);
    }

    values.push(limit, offset);

    const result = await pgPool.query(
      `SELECT id, scope, content, confidence, created_at, updated_at, last_accessed_at, access_count, locked
       FROM memory_records
       WHERE ${conditions.join(" AND ")}
       ORDER BY ${sortBy} ${sortOrder}
       LIMIT $${paramIdx++} OFFSET $${paramIdx}`,
      values
    );

    res.json({ ok: true, memories: result.rows });
  } catch (e: any) {
    console.error("[MEMORY][LIST]", e);
    return res.status(500).json({ ok: false, error: "internal_error" });
  }
});

/* =========================
   GET /api/memory/summary
========================= */
router.get("/summary", async (req: any, res) => {
  try {
    const workspaceId = req.workspace?.id;
    if (!workspaceId) return res.status(400).json({ ok: false, error: "workspace_required" });

    const userId = req.user?.userId;

    const scopeCounts = await pgPool.query(
      `SELECT scope, COUNT(*) as count, MAX(updated_at) as last_updated
       FROM memory_records
       WHERE workspace_id = $1 AND is_active = true
       GROUP BY scope
       ORDER BY scope`,
      [workspaceId]
    );

    const recentItems = await pgPool.query(
      `SELECT id, scope, content, confidence, updated_at
       FROM memory_records
       WHERE workspace_id = $1 AND is_active = true
       ORDER BY updated_at DESC
       LIMIT 10`,
      [workspaceId]
    );

    const crossMemories = await pgPool.query(
      `SELECT id, type, summary, created_at
       FROM cross_thread_memory
       WHERE workspace_id = $1 AND user_id = $2 AND is_archived = false
       ORDER BY created_at DESC
       LIMIT 10`,
      [workspaceId, userId]
    );

    res.json({
      ok: true,
      summary: {
        scopes: scopeCounts.rows,
        recentMemories: recentItems.rows,
        crossThreadMemories: crossMemories.rows,
      },
    });
  } catch (e: any) {
    console.error("[MEMORY][SUMMARY]", e);
    return res.status(500).json({ ok: false, error: "internal_error" });
  }
});

/* =========================
   GET /api/memory/search
   Query: ?q=&scopes=&minConfidence=&sortBy=&limit=&offset=
========================= */
router.get("/search", async (req: any, res) => {
  try {
    const workspaceId = req.workspace?.id;
    if (!workspaceId) return res.status(400).json({ ok: false, error: "workspace_required" });

    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    if (!q) return res.status(400).json({ ok: false, error: "query_required" });

    const scopesParam = typeof req.query.scopes === "string" ? req.query.scopes : "";
    const scopes = scopesParam ? scopesParam.split(",").filter((s: string) => VALID_SCOPES.has(s)) : [];
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const offset = Math.max(Number(req.query.offset) || 0, 0);
    const minConfidence = Math.max(Number(req.query.minConfidence) || 0, 0);
    const sortBy = VALID_SORT_BY.has(req.query.sortBy) ? req.query.sortBy : "updated_at";
    const sortOrder = req.query.sortOrder === "asc" ? "ASC" : "DESC";

    const conditions = ["workspace_id = $1", "is_active = true", "content ILIKE $2"];
    const values: any[] = [workspaceId, `%${q}%`];
    let paramIdx = 3;

    if (scopes.length > 0) {
      conditions.push(`scope = ANY($${paramIdx++})`);
      values.push(scopes);
    }
    if (minConfidence > 0) {
      conditions.push(`confidence >= $${paramIdx++}`);
      values.push(minConfidence);
    }

    values.push(limit, offset);

    const result = await pgPool.query(
      `SELECT id, scope, content, confidence, created_at, updated_at, access_count, locked
       FROM memory_records
       WHERE ${conditions.join(" AND ")}
       ORDER BY ${sortBy} ${sortOrder}
       LIMIT $${paramIdx++} OFFSET $${paramIdx}`,
      values
    );

    res.json({ ok: true, memories: result.rows });
  } catch (e: any) {
    console.error("[MEMORY][SEARCH]", e);
    return res.status(500).json({ ok: false, error: "internal_error" });
  }
});

/* =========================
   GET /api/memory/thread/:threadId
========================= */
router.get("/thread/:threadId", async (req: any, res) => {
  try {
    const workspaceId = req.workspace?.id;
    if (!workspaceId) return res.status(400).json({ ok: false, error: "workspace_required" });

    const threadId = Number(req.params.threadId);
    if (!Number.isInteger(threadId) || threadId <= 0) {
      return res.status(400).json({ ok: false, error: "invalid_thread_id" });
    }

    const result = await pgPool.query(
      `SELECT id, scope, content, confidence, created_at, updated_at, locked
       FROM memory_records
       WHERE workspace_id = $1 AND thread_id = $2 AND is_active = true
       ORDER BY created_at DESC`,
      [workspaceId, threadId]
    );

    res.json({ ok: true, memories: result.rows });
  } catch (e: any) {
    console.error("[MEMORY][THREAD]", e);
    return res.status(500).json({ ok: false, error: "internal_error" });
  }
});

/* =========================
   PATCH /api/memory/:id
========================= */
router.patch("/:id", async (req: any, res) => {
  try {
    const workspaceId = req.workspace?.id;
    if (!workspaceId) return res.status(400).json({ ok: false, error: "workspace_required" });

    const wsRole = req.workspace?.role;
    if (wsRole === "viewer") {
      return res.status(403).json({ ok: false, error: "insufficient_permission" });
    }

    const memoryId = Number(req.params.id);
    if (!Number.isInteger(memoryId) || memoryId <= 0) {
      return res.status(400).json({ ok: false, error: "invalid_memory_id" });
    }

    const { content, locked } = req.body ?? {};

    if (content !== undefined && (typeof content !== "string" || content.trim().length < 1)) {
      return res.status(400).json({ ok: false, error: "invalid_content" });
    }
    if (locked !== undefined && typeof locked !== "boolean") {
      return res.status(400).json({ ok: false, error: "invalid_locked" });
    }
    if (content === undefined && locked === undefined) {
      return res.status(400).json({ ok: false, error: "no_fields_to_update" });
    }

    const existing = await pgPool.query(
      "SELECT id FROM memory_records WHERE id = $1 AND workspace_id = $2 AND is_active = true",
      [memoryId, workspaceId]
    );
    if (!existing.rows.length) {
      return res.status(404).json({ ok: false, error: "not_found" });
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIdx = 1;

    if (content !== undefined) {
      updates.push(`content = $${paramIdx++}`);
      values.push(content.trim());
    }
    if (locked !== undefined) {
      updates.push(`locked = $${paramIdx++}`);
      values.push(locked);
    }
    updates.push(`updated_at = NOW()`);

    values.push(memoryId, workspaceId);
    await pgPool.query(
      `UPDATE memory_records SET ${updates.join(", ")} WHERE id = $${paramIdx++} AND workspace_id = $${paramIdx}`,
      values
    );

    res.json({ ok: true });
  } catch (e: any) {
    console.error("[MEMORY][PATCH]", e);
    return res.status(500).json({ ok: false, error: "internal_error" });
  }
});

/* =========================
   DELETE /api/memory/:id
========================= */
router.delete("/:id", async (req: any, res) => {
  try {
    const workspaceId = req.workspace?.id;
    if (!workspaceId) return res.status(400).json({ ok: false, error: "workspace_required" });

    const wsRole = req.workspace?.role;
    if (wsRole === "viewer") {
      return res.status(403).json({ ok: false, error: "insufficient_permission" });
    }

    const memoryId = Number(req.params.id);
    if (!Number.isInteger(memoryId) || memoryId <= 0) {
      return res.status(400).json({ ok: false, error: "invalid_memory_id" });
    }

    await pgPool.query(
      "UPDATE memory_records SET is_active = false, updated_at = NOW() WHERE id = $1 AND workspace_id = $2",
      [memoryId, workspaceId]
    );

    res.json({ ok: true });
  } catch (e: any) {
    console.error("[MEMORY][DELETE]", e);
    return res.status(500).json({ ok: false, error: "internal_error" });
  }
});

/* =========================
   POST /api/memory/bulk-delete
   Body: { ids: number[] }
========================= */
router.post("/bulk-delete", async (req: any, res) => {
  try {
    const workspaceId = req.workspace?.id;
    if (!workspaceId) return res.status(400).json({ ok: false, error: "workspace_required" });

    const wsRole = req.workspace?.role;
    if (wsRole === "viewer") {
      return res.status(403).json({ ok: false, error: "insufficient_permission" });
    }

    const ids = req.body?.ids;
    if (!Array.isArray(ids) || ids.length === 0 || ids.length > 100) {
      return res.status(400).json({ ok: false, error: "invalid_ids" });
    }
    const validIds = ids.filter((id: any) => Number.isInteger(id) && id > 0);
    if (validIds.length === 0) {
      return res.status(400).json({ ok: false, error: "invalid_ids" });
    }

    await pgPool.query(
      "UPDATE memory_records SET is_active = false, updated_at = NOW() WHERE id = ANY($1) AND workspace_id = $2",
      [validIds, workspaceId]
    );

    res.json({ ok: true, deleted: validIds.length });
  } catch (e: any) {
    console.error("[MEMORY][BULK_DELETE]", e);
    return res.status(500).json({ ok: false, error: "internal_error" });
  }
});

/* =========================
   POST /api/memory/bulk-lock
   Body: { ids: number[], locked: boolean }
========================= */
router.post("/bulk-lock", async (req: any, res) => {
  try {
    const workspaceId = req.workspace?.id;
    if (!workspaceId) return res.status(400).json({ ok: false, error: "workspace_required" });

    const wsRole = req.workspace?.role;
    if (wsRole === "viewer") {
      return res.status(403).json({ ok: false, error: "insufficient_permission" });
    }

    const { ids, locked } = req.body ?? {};
    if (!Array.isArray(ids) || ids.length === 0 || ids.length > 100) {
      return res.status(400).json({ ok: false, error: "invalid_ids" });
    }
    if (typeof locked !== "boolean") {
      return res.status(400).json({ ok: false, error: "invalid_locked" });
    }

    const validIds = ids.filter((id: any) => Number.isInteger(id) && id > 0);
    if (validIds.length === 0) {
      return res.status(400).json({ ok: false, error: "invalid_ids" });
    }

    await pgPool.query(
      "UPDATE memory_records SET locked = $1, updated_at = NOW() WHERE id = ANY($2) AND workspace_id = $3",
      [locked, validIds, workspaceId]
    );

    res.json({ ok: true, updated: validIds.length });
  } catch (e: any) {
    console.error("[MEMORY][BULK_LOCK]", e);
    return res.status(500).json({ ok: false, error: "internal_error" });
  }
});

export default router;
