import { Router } from "express";
import { ThreadEngine } from "../ai/engines/thread.engine";
import { pgPool } from "../db/postgres";
import { MessageEngine } from "../ai/engines/message-engine";
import { WorkspaceContext } from "../ai/workspace/workspace-context";
import { WorkspaceAccess } from "../ai/workspace/workspace-access";
import { isUuid } from "../utils/is-uuid";
import { translateReasoning } from "../ai/translator/reasoning-translator.client";

const router = Router();

router.use((req, _res, next) => {
  console.log("[chatUserRouter HIT]", req.method, req.path);
  next();
});

async function resolveWorkspace(req: any, userId: number) {
  const headerWs = req.headers["x-workspace-id"];
  if (isUuid(headerWs)) {
    const role = await WorkspaceAccess.getRole(headerWs, userId);
    if (role) return { workspaceId: headerWs, role };
    // D3 fix: explicit workspace ID with no access → reject instead of silent fallback
    const err: any = new Error("workspace_access_denied");
    err.status = 403;
    throw err;
  }
  const ctx = await WorkspaceContext.resolve({ userId });
  return { workspaceId: ctx.workspaceId, role: ctx.role };
}

async function getTargetProjectRole(params: {
  projectId: string;
  userId: number;
}): Promise<"owner" | "editor" | "viewer" | null> {
  const r = await pgPool.query<{ role: any }>(
    `
    SELECT role
    FROM project_members
    WHERE project_id = $1 AND user_id = $2
    LIMIT 1
    `,
    [params.projectId, params.userId]
  );
  return (r.rows[0]?.role ?? null) as any;
}

/* =========================
   POST /api/chat/thread
========================= */
router.post("/thread", async (req: any, res) => {
  try {
    const userId: number | undefined = Number(req.user?.id ?? req.user?.userId);
    if (!userId) return res.status(401).json({ ok: false });

    const { title, projectId } = req.body ?? {};
    const finalTitle =
      typeof title === "string" && title.trim().length > 0 ? title.trim() : "New Chat";

    const pid = typeof projectId === "string" ? projectId : null;

    // ✅ project thread 생성 권한:
    // - workspace owner/admin => ok
    // - project owner/editor => ok
    // - project viewer => 불가

    if (pid) {
      const { workspaceId, role } = await resolveWorkspace(req, userId);

      // project가 같은 workspace인지 최소 보장
      const check = await pgPool.query(
        `SELECT 1 FROM projects WHERE id = $1 AND workspace_id = $2 LIMIT 1`,
        [pid, workspaceId]
      );
      if (!check.rows.length) return res.status(404).json({ ok: false, error: "project_not_found" });

      if (!WorkspaceAccess.isAdmin(role)) {
        const pr = await getTargetProjectRole({ projectId: pid, userId });
        if (pr !== "owner" && pr !== "editor") {
          return res.status(403).json({ ok: false, error: "project_write_required" });
        }
      }

      const threadId = await ThreadEngine.createThread({
        userId,
        workspaceId,
        title: finalTitle,
        projectId: pid,
        visibility: "workspace", // ✅ SSOT: project thread는 workspace
      });
      return res.json({ ok: true, threadId });
    }

    const { workspaceId } = await resolveWorkspace(req, userId);
    const threadId = await ThreadEngine.createThread({
      userId,
      workspaceId,
      title: finalTitle,
      projectId: pid,
      visibility: "private", // 기본 private
    });

    return res.json({ ok: true, threadId });
  } catch (e: any) {
    console.error("[CHAT][THREAD][CREATE]", e);
    return res.status(e.status ?? 500).json({ ok: false, error: e.message });
  }
});

/* =========================
   GET /api/chat/thread/grouped
   - Returns threads grouped by ALL user's workspaces in one call
   - No x-workspace-id header needed
   - ?perGroup=N (default 10, max 50)
========================= */
router.get("/thread/grouped", async (req: any, res) => {
  try {
    const userId: number | undefined = req.user?.userId;
    if (!userId) return res.status(401).json({ ok: false });

    const perGroup = Math.min(
      Math.max(Number(req.query.perGroup) || 10, 1),
      50
    );

    const result = await ThreadEngine.listThreadsGrouped({ userId, perGroup });

    return res.json({
      ok: true,
      groups: result.groups.map((g) => ({
        workspace: g.workspace,
        threads: g.threads.map((t) => ({
          id: t.id,
          title: t.title,
          lastActivityAt: new Date(t.last_activity_at).toISOString(),
          pinned: t.pinned,
          pinnedOrder: t.pinned_order,
          visibility: t.visibility,
          projectId: t.project_id ?? null,
          caps: t.caps ?? null,
        })),
        threadCount: g.threadCount,
        hasMore: g.hasMore,
      })),
    });
  } catch (e: any) {
    console.error("[CHAT][THREAD][GROUPED]", e);
    return res.status(e.status ?? 500).json({ ok: false, error: e.message });
  }
});

/* =========================
   GET /api/chat/thread
========================= */
router.get("/thread", async (req: any, res) => {
  try {
    const userId: number | undefined = req.user?.userId;
    if (!userId) return res.status(401).json({ ok: false });

    const { workspaceId } = await resolveWorkspace(req, userId);

    // ✅ SSOT: projectId query contract
    // - (absent)        => all threads
    // - projectId=null  => general threads only (project_id IS NULL)
    // - projectId=<id>  => project threads only
    const raw = req.query.projectId;
    let projectId: string | null | undefined = undefined;
    if (typeof raw === "string") {
      if (raw === "null" || raw.trim() === "") projectId = null;
      else projectId = raw;
    }

    const rows = await ThreadEngine.listThreads({ userId, workspaceId, projectId });

    return res.json({
      ok: true,
      threads: rows.map((t) => ({
        id: t.id,
        title: t.title,
        projectId: t.project_id ?? null,
        createdAt: new Date(t.created_at).getTime(),
        lastActiveAt: new Date(t.last_activity_at).getTime(),
        pinned: t.pinned,
        pinnedOrder: t.pinned_order,
        caps: t.caps ?? null,
      })),
    });
  } catch (e: any) {
    console.error("[CHAT][THREAD][LIST]", e);
    return res.status(e.status ?? 500).json({ ok: false, error: e.message });
  }
});

/* =========================
   PUT /api/chat/thread/:id
   - rename (owner)
========================= */
router.put("/thread/:id", async (req: any, res) => {
  try {
    const userId: number | undefined = req.user?.userId;
    const threadId = Number(req.params.id);
    const title = String(req.body?.title ?? "").trim();

    if (!userId || !threadId || !title) return res.status(400).json({ ok: false });

    const meta = await ThreadEngine.getThreadMeta(threadId);
    if (!meta) return res.status(404).json({ ok: false, error: "thread_not_found" });
    const workspaceId = meta.workspace_id;

    const ok = await ThreadEngine.renameThread(threadId, userId, workspaceId, title);
    return res.status(ok ? 200 : 403).json({ ok });
  } catch (e: any) {
    console.error("[CHAT][THREAD][RENAME]", e);
    return res.status(e.status ?? 500).json({ ok: false, error: e.message });
  }
});

/* =========================
   POST /api/chat/thread/:id/pin
========================= */
router.post("/thread/:id/pin", async (req: any, res) => {
  try {
    const userId: number | undefined = Number(req.user?.id ?? req.user?.userId);
    const threadId = Number(req.params.id);
    if (!userId || !threadId) return res.status(400).json({ ok: false });

    const meta = await ThreadEngine.getThreadMeta(threadId);
    if (!meta) return res.status(404).json({ ok: false, error: "thread_not_found" });
    const workspaceId = meta.workspace_id;
 

        let result;
    try {
      result = await ThreadEngine.togglePin(threadId, userId, workspaceId);
    } catch (e: any) {
      return res.status(403).json({ ok: false, error: e.message ?? "pin_not_allowed" });
    }

    return res.json({
      ok: true,
      thread: {
        id: threadId,
        pinned: result.pinned,
        pinnedOrder: result.pinned_order,
      },
    });
  } catch (e: any) {
    console.error("[CHAT][THREAD][PIN]", e);
    return res.status(e.status ?? 500).json({ ok: false, error: e.message });
  }
});

/* =========================
   DELETE /api/chat/thread/:id
========================= */
router.delete("/thread/:id", async (req: any, res) => {
  try {
    const userId: number | undefined = Number(req.user?.id ?? req.user?.userId);
    const threadId = Number(req.params.id);
    if (!userId || !threadId) return res.status(400).json({ ok: false });

    const meta = await ThreadEngine.getThreadMeta(threadId);
    if (!meta) return res.status(404).json({ ok: false, error: "thread_not_found" });
    const workspaceId = meta.workspace_id;

    const ok = await ThreadEngine.deleteThread(threadId, userId, workspaceId);
    return res.status(ok ? 200 : 403).json({ ok });
  } catch (e: any) {
    console.error("[CHAT][THREAD][DELETE]", e);
    return res.status(e.status ?? 500).json({ ok: false, error: e.message });
  }
});

/* =========================
   ✅ Move thread
   POST /api/chat/thread/:id/move
   body: { projectId: string | null }
========================= */
router.post("/thread/:id/move", async (req: any, res) => {
  try {
    const userId: number | undefined = Number(req.user?.id ?? req.user?.userId);
    const threadId = Number(req.params.id);
    if (!userId || !threadId) return res.status(400).json({ ok: false });

    const meta = await ThreadEngine.getThreadMeta(threadId);
    if (!meta) return res.status(404).json({ ok: false, error: "thread_not_found" });
    const workspaceId = meta.workspace_id;
    const role = await WorkspaceAccess.getRole(workspaceId, userId); // null 가능

    const raw = req.body?.projectId;
    const projectId = raw === null || raw === "null" || raw === "" ? null : String(raw);

    let targetProjectRole: any = null;
    if (projectId) {
      // project가 같은 workspace인지 보장
      const check = await pgPool.query(
        `SELECT 1 FROM projects WHERE id = $1 AND workspace_id = $2 LIMIT 1`,
        [projectId, workspaceId]
      );
      if (!check.rows.length) return res.status(404).json({ ok: false, error: "project_not_found" });

      if (!WorkspaceAccess.isAdmin(role)) {
        targetProjectRole = await getTargetProjectRole({ projectId, userId });
      }
    }

    const ok = await ThreadEngine.moveThread({
      threadId,
      workspaceId,
      userId,
      projectId,
      targetProjectRole,
    });

    return res.status(ok ? 200 : 403).json({ ok });
  } catch (e: any) {
    console.error("[CHAT][THREAD][MOVE]", e);
    return res.status(e.status ?? 500).json({ ok: false, error: e.message });
  }
});

/* =========================
   ✅ Bump thread
   POST /api/chat/thread/:id/bump
========================= */
router.post("/thread/:id/bump", async (req: any, res) => {
  try {
    const userId: number | undefined = Number(req.user?.id ?? req.user?.userId);
    const threadId = Number(req.params.id);
    if (!userId || !threadId) return res.status(400).json({ ok: false });

    const meta = await ThreadEngine.getThreadMeta(threadId);
    if (!meta) return res.status(404).json({ ok: false, error: "thread_not_found" });
    const workspaceId = meta.workspace_id;

    const out = await ThreadEngine.bumpThread({ threadId, userId, workspaceId });
    if (!out) return res.status(403).json({ ok: false });

    return res.json({ ok: true, lastActiveAt: out.lastActiveAt });
  } catch (e: any) {
    console.error("[CHAT][THREAD][BUMP]", e);
    return res.status(e.status ?? 500).json({ ok: false, error: e.message });
  }
});

/* =========================
   ✅ Admin 승격 API
   POST /api/chat/thread/:id/promote
   body: { projectId }
========================= */
router.post("/thread/:id/promote", async (req: any, res) => {
  try {
    const userId: number | undefined = Number(req.user?.id ?? req.user?.userId);
    const threadId = Number(req.params.id);
    const projectId = String(req.body?.projectId ?? "");

    if (!userId || !threadId || !projectId) return res.status(400).json({ ok: false });

    const meta = await ThreadEngine.getThreadMeta(threadId);
    if (!meta) return res.status(404).json({ ok: false, error: "thread_not_found" });
    const workspaceId = meta.workspace_id;
    const role = await WorkspaceAccess.getRole(workspaceId, userId);
    if (!role) {
      return res.status(403).json({ ok: false, error: "workspace_forbidden" });
    }

    if (!WorkspaceAccess.isAdmin(role)) {
      return res.status(403).json({ ok: false, error: "admin_required" });
    }

  // ✅ 최소 안전장치: project가 해당 workspace 소속인지 확인
    const check = await pgPool.query(
      `SELECT 1 FROM projects WHERE id = $1 AND workspace_id = $2 LIMIT 1`,
      [projectId, workspaceId]
    );
    if (!check.rows.length) {
      return res.status(404).json({ ok: false, error: "project_not_found" });
    }

    // ✅ backward compat: move로 위임
    const ok = await ThreadEngine.moveThread({
      threadId,
      workspaceId,
      userId,
      projectId,
    });

 

    return res.json({ ok });
  } catch (e: any) {
    console.error("[CHAT][THREAD][PROMOTE]", e);
    return res.status(e.status ?? 500).json({ ok: false, error: e.message });
  }
});

/* =========================
   POST /api/chat/thread/:id/auto-title
========================= */
router.post("/thread/:id/auto-title", async (req: any, res) => {
  try {
    const userId: number | undefined = Number(req.user?.id ?? req.user?.userId);
    const threadId = Number(req.params.id);
    if (!userId || !threadId) return res.status(400).json({ ok: false });

    const meta = await ThreadEngine.getThreadMeta(threadId);
    if (!meta) return res.status(404).json({ ok: false, error: "thread_not_found" });

    const workspaceId = meta.workspace_id;

    // ✅ NEW: seed fallback 수신
    const seed =
      typeof req.body?.seed === "string"
        ? req.body.seed.trim()
        : "";


    const result = await ThreadEngine.autoTitleThread({
      threadId,
      userId,
      workspaceId,
      seed,
    });

    return res.json(result);

  } catch (e: any) {
    console.error("[CHAT][THREAD][AUTO_TITLE]", e);
    return res.status(500).json({ ok: false });
  }
});

/* =========================
   POST /api/chat/message
========================= */
router.post("/message", async (req: any, res) => {
  try {
    const userId: number | undefined = Number(req.user?.id ?? req.user?.userId);
    const { threadId, role, content, model, files } = req.body ?? {};
    if (!userId || !threadId || !["user", "assistant", "system"].includes(role)) {
      return res.status(400).json({ ok: false });
    }

    const meta = await ThreadEngine.getThreadMeta(Number(threadId));
    if (!meta) return res.status(404).json({ ok: false, error: "thread_not_found" });
    const workspaceId = meta.workspace_id;

    const can = await ThreadEngine.canWrite({
      threadId: Number(threadId),
      userId,
      workspaceId,
    });
    if (!can) return res.status(403).json({ ok: false });

    const messageId = await MessageEngine.addMessage({
      threadId: Number(threadId),
      userId,
      role,
      content,
      model: model ?? null,
      files: files ?? null,
    });

   await pgPool.query(
      `UPDATE conversation_threads SET last_activity_at = NOW() WHERE id = $1`,
      [Number(threadId)]
    );

    return res.json({ ok: true, messageId });
  } catch (e: any) {
    console.error("[CHAT][MESSAGE][CREATE]", e);
    return res.status(e.status ?? 500).json({ ok: false, error: e.message });
  }
});

/* =========================
   POST /api/chat/translate
========================= */
router.post("/translate", async (req: any, res) => {
  try {
    const userId: number | undefined = Number(req.user?.id ?? req.user?.userId);
    if (!userId) return res.status(401).json({ ok: false, error: "unauthorized" });

    const text = typeof req.body?.text === "string" ? req.body.text : "";
    const target =
      req.body?.target === "ko"
        ? "ko"
        : req.body?.target === "en"
          ? "en"
          : null;

    if (!target) return res.status(400).json({ ok: false, error: "invalid_target" });
    if (!text.trim()) return res.json({ ok: true, target, text });

    const limited = text.slice(0, 2000);
    const translated = await translateReasoning(limited, target);

    return res.json({
      ok: true,
      target,
      text: translated,
    });
  } catch (e: any) {
    console.error("[CHAT][TRANSLATE]", e);
    return res.status(500).json({
      ok: false,
      error: "translate_failed",
    });
  }
});
/* =========================
   GET /api/chat/snapshot?traceId=
========================= */
router.get("/snapshot", async (req: any, res) => {
  try {
    const userId: number | undefined = Number(req.user?.id ?? req.user?.userId);
    const traceId = String(req.query.traceId ?? "");

    if (!userId || !traceId)
      return res.status(400).json({ ok: false });

    const r1 = await pgPool.query(
      `SELECT thread_id FROM chat_activity_snapshots WHERE trace_id = $1 LIMIT 1`,
      [traceId]
    );

    if (!r1.rows.length)
      return res.json({ ok: true, threadId: null, messageId: null, snapshot: null });

    const threadId = r1.rows[0].thread_id;

    // 🔥 snapshot anchor 복원용 assistant messageId 조회 (meta/can과 무관하게 가능하면 내려줌)
    const m = await pgPool.query(
      `
      SELECT id
      FROM chat_messages
      WHERE trace_id = $1
        AND role = 'assistant'
      ORDER BY id DESC
      LIMIT 1
      `,
      [traceId]
    );
    const messageId = m.rows.length > 0 ? String(m.rows[0].id) : null;

    // ✅ SSOT: snapshot endpoint는 "없으면 null"이고 404를 내면 안 됨
    // (thread meta가 없거나, workspace 컨텍스트가 달라도) hydrate는 graceful해야 함
    const meta = await ThreadEngine.getThreadMeta(threadId);
    if (!meta) {
      const r = await pgPool.query(
        `SELECT snapshot FROM chat_activity_snapshots WHERE trace_id = $1 LIMIT 1`,
        [traceId]
      );
      return res.json({
        ok: true,
        threadId,
        messageId,
        snapshot: r.rows[0]?.snapshot ?? null,
      });
    }

    const can = await ThreadEngine.canAccess({
      threadId,
      userId,
      workspaceId: meta.workspace_id,
    });

    if (!can)
      return res.status(403).json({ ok: false });

    const r = await pgPool.query(
      `SELECT snapshot FROM chat_activity_snapshots WHERE trace_id = $1 LIMIT 1`,
      [traceId]
    );

    const snap = r.rows[0]?.snapshot ?? null;
    const chunkCount = Array.isArray(snap?.chunks) ? snap.chunks.length : 0;
    console.log("[SNAPSHOT_API][OUT]", {
      traceId,
      threadId,
      messageId,
      hasSnapshot: Boolean(snap),
      chunkCount,
      finalized: snap?.finalized ?? null,
    });

    return res.json({
      ok: true,
      threadId,
      messageId,
      snapshot: r.rows[0]?.snapshot ?? null,
    });
  } catch (e: any) {
    console.error("[CHAT][SNAPSHOT]", e);
    return res.status(500).json({ ok: false });
  }
});

/* =========================
   GET /api/chat/message
========================= */
router.get("/message", async (req: any, res) => {
  try {
    const userId: number | undefined = Number(req.user?.id ?? req.user?.userId);
    const threadId = Number(req.query.threadId);
    if (!userId || !threadId || Number.isNaN(threadId)) {
      return res.status(400).json({ ok: false, error: "Invalid threadId" });
    }

    // ✅ SSOT: threadId가 있으면 header workspace 무시하고 DB workspace를 기준으로 판단
    const meta = await ThreadEngine.getThreadMeta(threadId);
    if (!meta) return res.status(404).json({ ok: false, error: "thread_not_found" });

    const can = await ThreadEngine.canAccess({
      threadId,
      userId,
      workspaceId: meta.workspace_id,
    });
    if (!can) return res.status(403).json({ ok: false });

    const rows = await MessageEngine.listMessages(threadId);
    console.log("[BACKEND_MESSAGES_OUT]", {
      threadId,
      count: rows.length,
      first: rows[0]
        ? {
            id: rows[0].id,
            role: rows[0].role,
            trace_id: rows[0].trace_id,
            meta: rows[0].meta ?? null,
          }
        : null,
    });

    for (const row of rows) {
      console.log("[API_META_OUT]", {
        id: row.id,
        typeofMeta: typeof row.meta,
        rawMeta: row.meta ?? null,
      });
    }

    return res.json({
      ok: true,
      messages: rows.map((m) => ({
        id: String(m.id),
        threadId,
        role: m.role,
        content: m.content,
        meta: m.meta ?? undefined,
        model: m.model,
        traceId: m.trace_id ?? undefined,
        createdAt: new Date(m.created_at).getTime(),
        files: m.files ?? [],
      })),
    });
  } catch (e: any) {
    console.error("[CHAT][MESSAGE][LIST]", e);
    return res.status(e.status ?? 500).json({ ok: false, error: e.message });
  }
});

export default router;
