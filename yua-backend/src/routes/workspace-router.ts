import { Router } from "express";
import { requireFirebaseAuth } from "../auth/auth.express";
import { withWorkspace } from "../middleware/with-workspace";
import { rateLimit } from "../middleware/rate-limit";
import { WorkspaceAccess } from "../ai/workspace/workspace-access";
import { WorkspacePlanService } from "../ai/plan/workspace-plan.service";
import { PlanGuard } from "../ai/plan/plan-guard";
import { WorkspaceTeamEngine } from "../ai/workspace/workspace-team.engine";
import { WorkspaceContext } from "../ai/workspace/workspace-context";
import { pgPool } from "../db/postgres";
import { isUuid } from "../utils/is-uuid";
import { signWorkspaceDocWsToken } from "../ai/workspace/workspace-doc-ws-token";

const router = Router();
router.use(requireFirebaseAuth);

// ✅ workspace header 존중 + fallback personal (middleware SSOT)
router.use(withWorkspace);

/* =========================
   Helpers
========================= */

function getUserId(req: any): number | null {
  const raw = req.user?.userId ?? req.user?.id;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function isBusinessOrAbove(tier: string) {
  return tier === "business" || tier === "enterprise";
}

function isEnterprise(tier: string) {
  return tier === "enterprise";
}

async function assertTeamAllowed(workspaceId: string) {
  const tier = await WorkspacePlanService.getTier(workspaceId);
  const guard = PlanGuard.assertTeamAccess(tier);
  return { tier, guard };
}

/* =========================
   POST /api/workspace/docs/:docId/ws-token
========================= */
router.post("/docs/:docId/ws-token", async (req: any, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ ok: false, error: "unauthorized" });

    const docId = String(req.params.docId ?? "").trim();
    if (!isUuid(docId)) {
      return res.status(400).json({ ok: false, error: "invalid_doc_id" });
    }

    const docRes = await pgPool.query<{ id: string; workspace_id: string }>(
      `
        SELECT id, workspace_id
        FROM workspace_docs
        WHERE id = $1
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [docId]
    );
    const doc = docRes.rows[0];
    if (!doc) return res.status(404).json({ ok: false, error: "doc_not_found" });

    const role = await WorkspaceAccess.getRole(doc.workspace_id, userId);
    if (!role) return res.status(403).json({ ok: false, error: "workspace_membership_required" });

    const ttlMsRaw = Number(req.body?.ttlMs);
    const ttlMs = Number.isFinite(ttlMsRaw)
      ? Math.max(30_000, Math.min(10 * 60 * 1000, Math.floor(ttlMsRaw)))
      : 3 * 60 * 1000;

    const token = signWorkspaceDocWsToken(
      {
        docId,
        workspaceId: doc.workspace_id,
        userId,
        role,
      },
      ttlMs
    );

    return res.json({
      ok: true,
      token,
      wsUrl: `/ws/docs?token=${encodeURIComponent(token)}&docId=${encodeURIComponent(docId)}`,
      role,
      canWrite: role !== "viewer",
      ttlMs,
    });
  } catch (e: any) {
    console.error("[WORKSPACE][DOC_WS_TOKEN]", e);
    return res.status(500).json({ ok: false, error: e.message ?? "failed" });
  }
});

/* =========================
   GET /api/workspace/docs
========================= */
router.get("/docs", async (req: any, res) => {
  try {
    const ws = req.workspace?.id;
    const userId = getUserId(req);
    if (!ws || !userId) return res.status(401).json({ ok: false, error: "unauthorized" });

    const projectIdRaw = String(req.query?.projectId ?? "").trim();
    const projectId = isUuid(projectIdRaw) ? projectIdRaw : null;

    const q = await pgPool.query<{
      id: string;
      workspace_id: string;
      project_id: string | null;
      title: string;
      icon: string | null;
      content_type: string;
      updated_at: string;
      created_at: string;
      last_edited_by: string | null;
      created_by: string;
    }>(
      `
        SELECT
          id,
          workspace_id,
          project_id,
          title,
          icon,
          content_type,
          updated_at,
          created_at,
          last_edited_by,
          created_by
        FROM workspace_docs
        WHERE workspace_id = $1
          AND deleted_at IS NULL
          AND ($2::uuid IS NULL OR project_id = $2::uuid)
        ORDER BY updated_at DESC
        LIMIT 200
      `,
      [ws, projectId]
    );

    return res.json({ ok: true, docs: q.rows });
  } catch (e: any) {
    console.error("[WORKSPACE][DOCS][LIST]", e);
    return res.status(500).json({ ok: false, error: e.message ?? "failed" });
  }
});

/* =========================
   POST /api/workspace/docs
========================= */
router.post("/docs", async (req: any, res) => {
  try {
    const ws = req.workspace?.id;
    const userId = getUserId(req);
    if (!ws || !userId) return res.status(401).json({ ok: false, error: "unauthorized" });

    const titleRaw = String(req.body?.title ?? "").trim();
    const title = titleRaw.length > 0 ? titleRaw.slice(0, 200) : "새 문서";
    const projectIdRaw = String(req.body?.projectId ?? "").trim();
    const projectId = isUuid(projectIdRaw) ? projectIdRaw : null;
    const contentTypeRaw = String(req.body?.content_type ?? "").trim();
    const contentType = contentTypeRaw === "blocks" ? "blocks" : "markdown";

    const inserted = await pgPool.query<{
      id: string;
      workspace_id: string;
      project_id: string | null;
      title: string;
      icon: string | null;
      content_type: string;
      updated_at: string;
      created_at: string;
      last_edited_by: string | null;
      created_by: string;
    }>(
      `
        INSERT INTO workspace_docs
          (workspace_id, project_id, title, content_type, created_by, last_edited_by)
        VALUES
          ($1, $2, $3, $4, $5, $5)
        RETURNING
          id,
          workspace_id,
          project_id,
          title,
          icon,
          content_type,
          updated_at,
          created_at,
          last_edited_by,
          created_by
      `,
      [ws, projectId, title, contentType, userId]
    );

    return res.status(201).json({ ok: true, doc: inserted.rows[0] });
  } catch (e: any) {
    console.error("[WORKSPACE][DOCS][CREATE]", e);
    return res.status(500).json({ ok: false, error: e.message ?? "failed" });
  }
});

/* =========================
   GET /api/workspace/docs/:docId
========================= */
router.get("/docs/:docId", async (req: any, res) => {
  try {
    const ws = req.workspace?.id;
    const userId = getUserId(req);
    if (!ws || !userId) return res.status(401).json({ ok: false, error: "unauthorized" });

    const docId = String(req.params.docId ?? "").trim();
    if (!isUuid(docId)) return res.status(400).json({ ok: false, error: "invalid_doc_id" });

    const q = await pgPool.query<{
      id: string;
      workspace_id: string;
      project_id: string | null;
      title: string;
      icon: string | null;
      content_type: string;
      content_json: Record<string, unknown> | null;
      content_html: string | null;
      updated_at: string;
      created_at: string;
      last_edited_by: string | null;
      created_by: string;
    }>(
      `
        SELECT
          id,
          workspace_id,
          project_id,
          title,
          icon,
          content_type,
          content_json,
          content_html,
          updated_at,
          created_at,
          last_edited_by,
          created_by
        FROM workspace_docs
        WHERE id = $1
          AND workspace_id = $2
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [docId, ws]
    );
    if (!q.rows[0]) return res.status(404).json({ ok: false, error: "doc_not_found" });

    return res.json({ ok: true, doc: q.rows[0] });
  } catch (e: any) {
    console.error("[WORKSPACE][DOCS][GET]", e);
    return res.status(500).json({ ok: false, error: e.message ?? "failed" });
  }
});

/* =========================
   PATCH /api/workspace/docs/:docId
========================= */
router.patch("/docs/:docId", async (req: any, res) => {
  try {
    const ws = req.workspace?.id;
    const userId = getUserId(req);
    if (!ws || !userId) return res.status(401).json({ ok: false, error: "unauthorized" });

    const docId = String(req.params.docId ?? "").trim();
    if (!isUuid(docId)) return res.status(400).json({ ok: false, error: "invalid_doc_id" });

    const titleRaw = String(req.body?.title ?? "").trim();
    if (!titleRaw) return res.status(400).json({ ok: false, error: "title_required" });
    const title = titleRaw.slice(0, 200);

    const updated = await pgPool.query<{
      id: string;
      workspace_id: string;
      project_id: string | null;
      title: string;
      icon: string | null;
      updated_at: string;
      created_at: string;
      last_edited_by: string | null;
      created_by: string;
    }>(
      `
        UPDATE workspace_docs
        SET title = $3,
            last_edited_by = $4,
            updated_at = now()
        WHERE id = $1
          AND workspace_id = $2
          AND deleted_at IS NULL
        RETURNING
          id,
          workspace_id,
          project_id,
          title,
          icon,
          updated_at,
          created_at,
          last_edited_by,
          created_by
      `,
      [docId, ws, title, userId]
    );
    if (!updated.rows[0]) return res.status(404).json({ ok: false, error: "doc_not_found" });
    return res.json({ ok: true, doc: updated.rows[0] });
  } catch (e: any) {
    console.error("[WORKSPACE][DOCS][PATCH]", e);
    return res.status(500).json({ ok: false, error: e.message ?? "failed" });
  }
});

/* =========================
   PUT /api/workspace/docs/:docId/content
   Block editor auto-save (content_json + content_html)
========================= */
router.put("/docs/:docId/content", async (req: any, res) => {
  try {
    const ws = req.workspace?.id;
    const userId = getUserId(req);
    if (!ws || !userId) return res.status(401).json({ ok: false, error: "unauthorized" });

    const docId = String(req.params.docId ?? "").trim();
    if (!isUuid(docId)) return res.status(400).json({ ok: false, error: "invalid_doc_id" });

    const contentJson = req.body?.content_json;
    const contentHtml = typeof req.body?.content_html === "string" ? req.body.content_html : null;
    const contentType = String(req.body?.content_type ?? "blocks").trim();

    if (!contentJson || typeof contentJson !== "object") {
      return res.status(400).json({ ok: false, error: "content_json_required" });
    }

    const role = await WorkspaceAccess.getRole(ws, userId);
    if (!role || role === "viewer") {
      return res.status(403).json({ ok: false, error: "write_permission_required" });
    }

    const updated = await pgPool.query(
      `
        UPDATE workspace_docs
        SET content_type = $3,
            content_json = $4,
            content_html = $5,
            last_edited_by = $6,
            updated_at = now()
        WHERE id = $1
          AND workspace_id = $2
          AND deleted_at IS NULL
        RETURNING id
      `,
      [docId, ws, contentType, JSON.stringify(contentJson), contentHtml, userId]
    );

    if (!updated.rows[0]) {
      return res.status(404).json({ ok: false, error: "doc_not_found" });
    }

    // Async: sync blocks for RAG embedding (fire and forget)
    import("../ai/doc/doc-rag.js").then(({ syncDocBlocks }) => {
      syncDocBlocks(docId, contentJson).catch((err: any) =>
        console.error("[DOC_RAG][SYNC_ERROR]", err?.message)
      );
    });

    return res.json({ ok: true });
  } catch (e: any) {
    console.error("[WORKSPACE][DOCS][PUT_CONTENT]", e);
    return res.status(500).json({ ok: false, error: e.message ?? "failed" });
  }
});

/* =========================
   POST /api/workspace/docs/:docId/ai/generate
   AI block text generation
========================= */
router.post("/docs/:docId/ai/generate", async (req: any, res) => {
  try {
    const ws = req.workspace?.id;
    const userId = getUserId(req);
    if (!ws || !userId) return res.status(401).json({ ok: false, error: "unauthorized" });

    const docId = String(req.params.docId ?? "").trim();
    if (!isUuid(docId)) return res.status(400).json({ ok: false, error: "invalid_doc_id" });

    const { prompt, mode = "generate", selectionText, blockContext } = req.body ?? {};
    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({ ok: false, error: "prompt_required" });
    }

    // Get doc title
    const docRow = await pgPool.query(
      "SELECT title FROM workspace_docs WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL",
      [docId, ws]
    );
    const docTitle = docRow.rows[0]?.title ?? "";

    // Build context from surrounding blocks if provided
    const { buildDocPrompt } = await import("../ai/utils/doc-prompt-builder.js");
    const { searchDocBlocks, adjustScores } = await import("../ai/doc/doc-rag.js");

    let context: any[] = [];
    if (blockContext && Array.isArray(blockContext) && blockContext.length > 0) {
      // Use provided block IDs as context
      const { rows } = await pgPool.query(
        "SELECT id AS block_id, block_type, content FROM document_blocks WHERE id = ANY($1) AND doc_id = $2",
        [blockContext, docId]
      );
      context = rows.map((r: any) => ({ ...r, score: 1.0 }));
    }

    const messages = buildDocPrompt({
      mode: mode as any,
      prompt: prompt.trim(),
      context,
      docTitle,
      selectionText,
    });

    // Call GPT-4.1-mini directly
    const OpenAI = (await import("openai")).default;
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: messages as any,
      max_tokens: 2000,
      temperature: 0.4,
    });

    const result = completion.choices[0]?.message?.content ?? "";
    const usage = completion.usage;

    return res.json({
      ok: true,
      result,
      model: "gpt-4.1-mini",
      usage: {
        promptTokens: usage?.prompt_tokens ?? 0,
        completionTokens: usage?.completion_tokens ?? 0,
      },
    });
  } catch (e: any) {
    console.error("[WORKSPACE][DOCS][AI_GENERATE]", e);
    return res.status(500).json({ ok: false, error: e.message ?? "ai_generate_failed" });
  }
});

/* =========================
   POST /api/workspace/docs/:docId/chat
   DocChat RAG Q&A
========================= */
router.post("/docs/:docId/chat", async (req: any, res) => {
  try {
    const ws = req.workspace?.id;
    const userId = getUserId(req);
    if (!ws || !userId) return res.status(401).json({ ok: false, error: "unauthorized" });

    const docId = String(req.params.docId ?? "").trim();
    if (!isUuid(docId)) return res.status(400).json({ ok: false, error: "invalid_doc_id" });

    const { sessionId, message, topK = 8 } = req.body ?? {};
    if (!message || typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ ok: false, error: "message_required" });
    }
    if (!sessionId || typeof sessionId !== "string") {
      return res.status(400).json({ ok: false, error: "session_id_required" });
    }

    // Get doc title
    const docRow = await pgPool.query(
      "SELECT title FROM workspace_docs WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL",
      [docId, ws]
    );
    if (!docRow.rows[0]) {
      return res.status(404).json({ ok: false, error: "doc_not_found" });
    }
    const docTitle = docRow.rows[0].title ?? "";

    // RAG search
    const { searchDocBlocks, adjustScores } = await import("../ai/doc/doc-rag.js");
    const { buildDocPrompt } = await import("../ai/utils/doc-prompt-builder.js");

    const rawResults = await searchDocBlocks(docId, message.trim(), topK);
    const results = adjustScores(rawResults);

    // Save user message
    await pgPool.query(
      "INSERT INTO doc_chat_messages (doc_id, session_id, role, content) VALUES ($1, $2, 'user', $3)",
      [docId, sessionId, message.trim()]
    );

    // Load recent chat history for this session (last 10 messages)
    const historyRows = await pgPool.query(
      `SELECT role, content FROM doc_chat_messages
       WHERE doc_id = $1 AND session_id = $2
       ORDER BY created_at DESC LIMIT 10`,
      [docId, sessionId]
    );
    const history = historyRows.rows.reverse();

    // Build prompt
    const context = results.map((r) => ({
      block_id: r.block_id,
      block_type: r.block_type,
      content: r.content,
      score: r.score,
    }));

    const promptMessages = buildDocPrompt({
      mode: "chat",
      prompt: message.trim(),
      context,
      docTitle,
    });

    // Inject history before user message
    const finalMessages: any[] = [];
    for (const m of promptMessages) {
      if (m.role === "user") {
        // Add history before user's current message
        for (const h of history.slice(0, -1)) {
          finalMessages.push({ role: h.role, content: h.content });
        }
      }
      finalMessages.push(m);
    }

    // Call GPT
    const OpenAI = (await import("openai")).default;
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: finalMessages,
      max_tokens: 2000,
      temperature: 0.3,
    });

    const reply = completion.choices[0]?.message?.content ?? "";

    // Parse citations from reply [block:xxx]
    const citationRegex = /\[block:([a-f0-9-]+)\]/g;
    const citations: any[] = [];
    let match;
    while ((match = citationRegex.exec(reply)) !== null) {
      const blockId = match[1];
      const found = results.find((r) => r.block_id === blockId);
      if (found) {
        citations.push({
          block_id: found.block_id,
          block_type: found.block_type,
          content_preview: found.content_preview,
          score: found.score,
          block_order: found.block_order,
        });
      }
    }

    // Save assistant message
    await pgPool.query(
      "INSERT INTO doc_chat_messages (doc_id, session_id, role, content, citations) VALUES ($1, $2, 'assistant', $3, $4)",
      [docId, sessionId, reply, JSON.stringify(citations)]
    );

    return res.json({
      ok: true,
      reply,
      citations,
      model: "gpt-4.1-mini",
      sessionId,
    });
  } catch (e: any) {
    console.error("[WORKSPACE][DOCS][DOC_CHAT]", e);
    return res.status(500).json({ ok: false, error: e.message ?? "doc_chat_failed" });
  }
});

/* =========================
   GET /api/workspace/docs/:docId/snapshot/latest
========================= */
router.get("/docs/:docId/snapshot/latest", async (req: any, res) => {
  try {
    const ws = req.workspace?.id;
    const userId = getUserId(req);
    if (!ws || !userId) return res.status(401).json({ ok: false, error: "unauthorized" });

    const docId = String(req.params.docId ?? "").trim();
    if (!isUuid(docId)) return res.status(400).json({ ok: false, error: "invalid_doc_id" });

    const docCheck = await pgPool.query<{ id: string }>(
      `
        SELECT id
        FROM workspace_docs
        WHERE id = $1
          AND workspace_id = $2
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [docId, ws]
    );
    if (!docCheck.rows[0]) return res.status(404).json({ ok: false, error: "doc_not_found" });

    const q = await pgPool.query<{
      id: string;
      version: number;
      state_hash: string | null;
      ydoc_state: Buffer | null;
      created_at: string;
    }>(
      `
        SELECT id, version, state_hash, ydoc_state, created_at
        FROM workspace_doc_snapshots
        WHERE doc_id = $1
        ORDER BY version DESC, id DESC
        LIMIT 1
      `,
      [docId]
    );

    const row = q.rows[0];
    if (!row) {
      // snapshot 없어도 WAL updates가 있을 수 있음
      const pendingQ = await pgPool.query<{ update: Buffer }>(
        `SELECT update FROM workspace_doc_updates
         WHERE doc_id = $1 ORDER BY id ASC`,
        [docId]
      );
      const pendingUpdates = pendingQ.rows.map((r) =>
        Buffer.from(r.update).toString("base64")
      );
      return res.json({ ok: true, snapshot: null, pendingUpdates });
    }

    const b = row.ydoc_state ? Buffer.from(row.ydoc_state) : null;
    const ydocStateBase64 = b ? b.toString("base64") : null;
    const textUtf8 = b ? b.toString("utf8") : "";

    // WAL: snapshot 이후 쌓인 pending updates
    const pendingQ = await pgPool.query<{ update: Buffer }>(
      `SELECT update FROM workspace_doc_updates
       WHERE doc_id = $1 AND created_at >= $2
       ORDER BY id ASC`,
      [docId, row.created_at]
    );
    const pendingUpdates = pendingQ.rows.map((r) =>
      Buffer.from(r.update).toString("base64")
    );

    return res.json({
      ok: true,
      snapshot: {
        id: row.id,
        version: row.version,
        stateHash: row.state_hash ?? null,
        ydocStateBase64,
        textUtf8,
        createdAt: row.created_at,
      },
      pendingUpdates,
    });
  } catch (e: any) {
    console.error("[WORKSPACE][DOCS][SNAPSHOT_LATEST]", e);
    return res.status(500).json({ ok: false, error: e.message ?? "failed" });
  }
});

/* =========================
   GET /api/workspace/docs/:docId/snapshot/by-version/:version
========================= */
router.get("/docs/:docId/snapshot/by-version/:version", async (req: any, res) => {
  try {
    const ws = req.workspace?.id;
    const userId = getUserId(req);
    if (!ws || !userId) return res.status(401).json({ ok: false, error: "unauthorized" });

    const docId = String(req.params.docId ?? "").trim();
    if (!isUuid(docId)) return res.status(400).json({ ok: false, error: "invalid_doc_id" });
    const version = Number(req.params.version);
    if (!Number.isFinite(version) || version < 1) {
      return res.status(400).json({ ok: false, error: "invalid_version" });
    }

    const docCheck = await pgPool.query<{ id: string }>(
      `
        SELECT id
        FROM workspace_docs
        WHERE id = $1
          AND workspace_id = $2
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [docId, ws]
    );
    if (!docCheck.rows[0]) return res.status(404).json({ ok: false, error: "doc_not_found" });

    const q = await pgPool.query<{
      id: string;
      version: number;
      state_hash: string | null;
      ydoc_state: Buffer | null;
      created_at: string;
    }>(
      `
        SELECT id, version, state_hash, ydoc_state, created_at
        FROM workspace_doc_snapshots
        WHERE doc_id = $1
          AND version = $2
        ORDER BY id DESC
        LIMIT 1
      `,
      [docId, Math.floor(version)]
    );
    const row = q.rows[0];
    if (!row) return res.status(404).json({ ok: false, error: "snapshot_not_found" });

    const b = row.ydoc_state ? Buffer.from(row.ydoc_state) : null;
    const ydocStateBase64 = b ? b.toString("base64") : null;
    const textUtf8 = b ? b.toString("utf8") : "";
    return res.json({
      ok: true,
      snapshot: {
        id: row.id,
        version: row.version,
        stateHash: row.state_hash ?? null,
        ydocStateBase64,
        textUtf8,
        createdAt: row.created_at,
      },
    });
  } catch (e: any) {
    console.error("[WORKSPACE][DOCS][SNAPSHOT_BY_VERSION]", e);
    return res.status(500).json({ ok: false, error: e.message ?? "failed" });
  }
});

/* =========================
   GET /api/workspace/docs/:docId/revisions
========================= */
router.get("/docs/:docId/revisions", async (req: any, res) => {
  try {
    const ws = req.workspace?.id;
    const userId = getUserId(req);
    if (!ws || !userId) return res.status(401).json({ ok: false, error: "unauthorized" });

    const docId = String(req.params.docId ?? "").trim();
    if (!isUuid(docId)) return res.status(400).json({ ok: false, error: "invalid_doc_id" });

    const limitRaw = Number(req.query?.limit);
    const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(200, Math.floor(limitRaw))) : 50;

    const docCheck = await pgPool.query<{ id: string }>(
      `
        SELECT id
        FROM workspace_docs
        WHERE id = $1
          AND workspace_id = $2
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [docId, ws]
    );
    if (!docCheck.rows[0]) return res.status(404).json({ ok: false, error: "doc_not_found" });

    const revisions = await pgPool.query<{
      id: number;
      version: number;
      editor_user_id: number;
      summary: string;
      created_at: string;
      has_snapshot: boolean;
    }>(
      `
        SELECT
          r.id,
          r.version,
          r.editor_user_id,
          r.summary,
          r.created_at,
          (r.snapshot_id IS NOT NULL) AS has_snapshot
        FROM workspace_doc_revisions r
        WHERE r.doc_id = $1
        ORDER BY r.version DESC, r.id DESC
        LIMIT $2
      `,
      [docId, limit]
    );

    return res.json({ ok: true, revisions: revisions.rows });
  } catch (e: any) {
    console.error("[WORKSPACE][DOCS][REVISIONS]", e);
    return res.status(500).json({ ok: false, error: e.message ?? "failed" });
  }
});

/* =========================
   GET /api/workspace/docs/:docId/lock
========================= */
router.get("/docs/:docId/lock", async (req: any, res) => {
  try {
    const ws = req.workspace?.id;
    const userId = getUserId(req);
    if (!ws || !userId) return res.status(401).json({ ok: false, error: "unauthorized" });
    const docId = String(req.params.docId ?? "").trim();
    if (!isUuid(docId)) return res.status(400).json({ ok: false, error: "invalid_doc_id" });

    const q = await pgPool.query<{ is_locked: boolean; locked_by: number | null }>(
      `
        SELECT is_locked, locked_by
        FROM workspace_docs
        WHERE id = $1
          AND workspace_id = $2
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [docId, ws]
    );
    if (!q.rows[0]) return res.status(404).json({ ok: false, error: "doc_not_found" });
    return res.json({ ok: true, lock: q.rows[0] });
  } catch (e: any) {
    console.error("[WORKSPACE][DOCS][LOCK_GET]", e);
    return res.status(500).json({ ok: false, error: e.message ?? "failed" });
  }
});

/* =========================
   PATCH /api/workspace/docs/:docId/lock
========================= */
router.patch("/docs/:docId/lock", async (req: any, res) => {
  try {
    const ws = req.workspace?.id;
    const userId = getUserId(req);
    if (!ws || !userId) return res.status(401).json({ ok: false, error: "unauthorized" });
    const docId = String(req.params.docId ?? "").trim();
    if (!isUuid(docId)) return res.status(400).json({ ok: false, error: "invalid_doc_id" });
    const locked = Boolean(req.body?.locked);

    const q = await pgPool.query<{ is_locked: boolean; locked_by: number | null }>(
      `
        UPDATE workspace_docs
        SET is_locked = $3,
            locked_by = CASE WHEN $3 THEN $4 ELSE NULL END,
            updated_at = now(),
            last_edited_by = $4
        WHERE id = $1
          AND workspace_id = $2
          AND deleted_at IS NULL
        RETURNING is_locked, locked_by
      `,
      [docId, ws, locked, userId]
    );
    if (!q.rows[0]) return res.status(404).json({ ok: false, error: "doc_not_found" });
    return res.json({ ok: true, lock: q.rows[0] });
  } catch (e: any) {
    console.error("[WORKSPACE][DOCS][LOCK_PATCH]", e);
    return res.status(500).json({ ok: false, error: e.message ?? "failed" });
  }
});

/* =========================
   GET /api/workspace/docs/:docId/calendar-notes
========================= */
router.get("/docs/:docId/calendar-notes", async (req: any, res) => {
  try {
    const ws = req.workspace?.id;
    const userId = getUserId(req);
    if (!ws || !userId) return res.status(401).json({ ok: false, error: "unauthorized" });
    const docId = String(req.params.docId ?? "").trim();
    if (!isUuid(docId)) return res.status(400).json({ ok: false, error: "invalid_doc_id" });

    const month = String(req.query?.month ?? "").trim(); // YYYY-MM
    const monthStart = /^\\d{4}-\\d{2}$/.test(month) ? `${month}-01` : null;

    const docCheck = await pgPool.query<{ id: string }>(
      `
        SELECT id
        FROM workspace_docs
        WHERE id = $1
          AND workspace_id = $2
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [docId, ws]
    );
    if (!docCheck.rows[0]) return res.status(404).json({ ok: false, error: "doc_not_found" });

    const q = await pgPool.query<{
      id: number;
      note_date: string;
      memo: string;
      updated_by: number;
      updated_at: string;
    }>(
      `
        SELECT id, note_date::text, memo, updated_by, updated_at
        FROM workspace_doc_calendar_notes
        WHERE doc_id = $1
          AND deleted_at IS NULL
          AND (
            $2::date IS NULL
            OR (note_date >= $2::date AND note_date < ($2::date + interval '1 month')::date)
          )
        ORDER BY note_date ASC
      `,
      [docId, monthStart]
    );
    return res.json({ ok: true, notes: q.rows });
  } catch (e: any) {
    console.error("[WORKSPACE][DOCS][CALENDAR_NOTES_GET]", e);
    return res.status(500).json({ ok: false, error: e.message ?? "failed" });
  }
});

/* =========================
   POST /api/workspace/docs/:docId/calendar-notes
========================= */
router.post("/docs/:docId/calendar-notes", async (req: any, res) => {
  try {
    const ws = req.workspace?.id;
    const userId = getUserId(req);
    if (!ws || !userId) return res.status(401).json({ ok: false, error: "unauthorized" });
    const docId = String(req.params.docId ?? "").trim();
    if (!isUuid(docId)) return res.status(400).json({ ok: false, error: "invalid_doc_id" });
    const noteDate = String(req.body?.noteDate ?? "").trim();
    if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(noteDate)) {
      return res.status(400).json({ ok: false, error: "invalid_note_date" });
    }
    const memo = String(req.body?.memo ?? "").slice(0, 5000);

    const docCheck = await pgPool.query<{ id: string }>(
      `
        SELECT id
        FROM workspace_docs
        WHERE id = $1
          AND workspace_id = $2
          AND deleted_at IS NULL
        LIMIT 1
      `,
      [docId, ws]
    );
    if (!docCheck.rows[0]) return res.status(404).json({ ok: false, error: "doc_not_found" });

    const upsert = await pgPool.query<{
      id: number;
      note_date: string;
      memo: string;
      updated_by: number;
      updated_at: string;
    }>(
      `
        INSERT INTO workspace_doc_calendar_notes
          (doc_id, note_date, memo, created_by, updated_by)
        VALUES
          ($1, $2::date, $3, $4, $4)
        ON CONFLICT (doc_id, note_date) WHERE deleted_at IS NULL
        DO UPDATE SET
          memo = EXCLUDED.memo,
          updated_by = EXCLUDED.updated_by,
          updated_at = now()
        RETURNING id, note_date::text, memo, updated_by, updated_at
      `,
      [docId, noteDate, memo, userId]
    );
    return res.json({ ok: true, note: upsert.rows[0] });
  } catch (e: any) {
    console.error("[WORKSPACE][DOCS][CALENDAR_NOTES_POST]", e);
    return res.status(500).json({ ok: false, error: e.message ?? "failed" });
  }
});

/* =========================
   GET /api/workspace/list
========================= */
router.get("/list", async (req: any, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ ok: false, error: "unauthorized" });

    const items = await WorkspaceTeamEngine.listWorkspacesForUser(userId);
    const enriched = await Promise.all(
      items.map(async (w) => {
        const tier = await WorkspacePlanService.getTier(w.id);
        return { ...w, tier };
      })
    );

    return res.json({ ok: true, workspaces: enriched });
  } catch (e: any) {
    console.error("[WORKSPACE][LIST]", e);
    return res.status(500).json({ ok: false, error: e.message ?? "failed" });
  }
});

/* =========================
   GET /api/workspace/members
========================= */
router.get("/members", async (req: any, res) => {
  try {
    const ws = req.workspace?.id;
    if (!ws) return res.status(400).json({ ok: false, error: "workspace_required" });

    // ✅ 조회는 항상 허용 (FREE 포함)
    const tier = await WorkspacePlanService.getTier(ws);
    const guard = PlanGuard.assertTeamAccess(tier);

    const actorRole = req.workspace?.role;
    const isAdmin = WorkspaceAccess.isAdmin(actorRole);

    const data = await WorkspaceTeamEngine.listMembersAndInvites(ws);
    return res.json({
      ok: true,
      plan: { tier },
      myRole: actorRole,
      caps: {
        canInvite: guard.ok && isAdmin,
        canChangeRole: guard.ok && isAdmin,
        canRemoveMember: guard.ok && isAdmin,
        canApprove: guard.ok && isAdmin,
      },
      ...data,
    });

    
  } catch (e: any) {
    console.error("[WORKSPACE][MEMBERS][GET]", e);
    return res.status(500).json({ ok: false, error: e.message ?? "failed" });
  }
});

/* =========================
   POST /api/workspace/leave
========================= */
router.post("/leave", async (req: any, res) => {
  try {
    const ws = req.workspace?.id;
    const actorRole = req.workspace?.role;
    const userId = getUserId(req);
    if (!ws || !userId) return res.status(401).json({ ok: false, error: "unauthorized" });

    // personal workspace는 나가기 불가
    const w = await pgPool.query<{ type: string }>(
      `SELECT type FROM workspaces WHERE id = $1 LIMIT 1`,
      [ws]
    );
    if (w.rows[0]?.type === "personal") {
      return res.status(400).json({ ok: false, error: "cannot_leave_personal" });
    }

    if (actorRole === "owner") {
      return res.status(400).json({ ok: false, error: "owner_must_transfer" });
    }

    const ok = await WorkspaceTeamEngine.leaveWorkspace({
      workspaceId: ws,
      userId,
    });
    if (!ok) return res.status(404).json({ ok: false, error: "not_found" });

    const ctx = await WorkspaceContext.resolve({ userId });
    return res.json({ ok: true, nextWorkspaceId: ctx.workspaceId });
  } catch (e: any) {
    console.error("[WORKSPACE][LEAVE]", e);
    return res.status(500).json({ ok: false, error: e.message ?? "failed" });
  }
});

/* =========================
   POST /api/workspace/owner/transfer
========================= */
router.post("/owner/transfer", async (req: any, res) => {
  try {
    const ws = req.workspace?.id;
    const actorRole = req.workspace?.role;
    const userId = getUserId(req);
    if (!ws || !userId) return res.status(401).json({ ok: false, error: "unauthorized" });
    if (actorRole !== "owner") {
      return res.status(403).json({ ok: false, error: "owner_required" });
    }

    const targetUserId = Number(req.body?.targetUserId);
    if (!Number.isFinite(targetUserId) || targetUserId <= 0) {
      return res.status(400).json({ ok: false, error: "invalid_target" });
    }
    if (targetUserId === userId) {
      return res.status(400).json({ ok: false, error: "cannot_transfer_self" });
    }

    const result = await WorkspaceTeamEngine.transferOwnership({
      workspaceId: ws,
      currentOwnerId: userId,
      targetUserId,
    });
    if (!result.ok) {
      return res.status(400).json({ ok: false, error: result.error ?? "transfer_failed" });
    }

    return res.json({ ok: true });
  } catch (e: any) {
    console.error("[WORKSPACE][OWNER_TRANSFER]", e);
    return res.status(500).json({ ok: false, error: e.message ?? "failed" });
  }
});

/* =========================
   POST /api/workspace/members  ✅ (프론트 계약)
   body: { email, role? }  // invite
========================= */
async function inviteHandler(req: any, res: any) {
  try {
    const userId = getUserId(req);
    const ws = req.workspace?.id;
    const actorRole = req.workspace?.role;

    if (!userId || !ws) return res.status(401).json({ ok: false, error: "unauthorized" });

    // ✅ plan gate
    const { guard } = await assertTeamAllowed(ws);
    if (!guard.ok) return res.status(403).json({ ok: false, error: guard.error });

    // ✅ admin/owner only
    if (!WorkspaceAccess.isAdmin(actorRole)) {
      return res.status(403).json({ ok: false, error: "admin_required" });
    }

    const email = String(req.body?.email ?? "").trim();
    const inviteRole = String(req.body?.role ?? "member");

    if (!email) return res.status(400).json({ ok: false, error: "email_required" });
    if (!["admin", "member", "viewer"].includes(inviteRole)) {
      return res.status(400).json({ ok: false, error: "invalid_role" });
    }

    const r = await WorkspaceTeamEngine.inviteByEmail({
      workspaceId: ws,
      invitedByUserId: userId,
      email,
      role: inviteRole as any,
    });

    if (!r.ok) return res.status(500).json({ ok: false, error: r.error });

    const data = await WorkspaceTeamEngine.listMembersAndInvites(ws);
    return res.json({ ok: true, immediate: r.immediate, ...data });
  } catch (e: any) {
    console.error("[WORKSPACE][MEMBERS][POST]", e);
    return res.status(500).json({ ok: false, error: e.message ?? "failed" });
  }
}

router.post("/members", rateLimit, inviteHandler);
// ✅ 구버전 호환(혹시 남아있으면)
router.post("/invite", rateLimit, inviteHandler);

/* =========================
   PATCH /api/workspace/members/:userId/role ✅ (프론트 계약)
   PATCH /api/workspace/members/:userId      ✅ (호환)
   body: { role }
========================= */
async function updateRoleHandler(req: any, res: any) {
  try {
    const ws = req.workspace?.id;
    const actorRole = req.workspace?.role;
    const actorId = getUserId(req);

    if (!ws) return res.status(400).json({ ok: false, error: "workspace_required" });
    if (!actorId) return res.status(401).json({ ok: false, error: "unauthorized" });

    // ✅ plan gate
    const { guard } = await assertTeamAllowed(ws);
    if (!guard.ok) return res.status(403).json({ ok: false, error: guard.error });

    // ✅ admin/owner only
    if (!WorkspaceAccess.isAdmin(actorRole)) {
      return res.status(403).json({ ok: false, error: "admin_required" });
    }

    const targetUserId = Number(req.params.userId);
    const nextRole = String(req.body?.role ?? "");

    if (!Number.isFinite(targetUserId) || targetUserId <= 0) {
      return res.status(400).json({ ok: false, error: "invalid_userId" });
    }

    // ✅ owner 변경은 별도 플로우로 (안전)
    if (nextRole === "owner") {
      return res.status(400).json({ ok: false, error: "owner_change_not_supported" });
    }

    // ✅ 허용 role (workspace_users role check와도 정합)
    if (!["admin", "member", "viewer"].includes(nextRole)) {
      return res.status(400).json({ ok: false, error: "invalid_role" });
    }

    const ok = await WorkspaceTeamEngine.updateMemberRole({
      workspaceId: ws,
      targetUserId,
      role: nextRole as any,
    });

    return res.status(ok ? 200 : 404).json({ ok });
  } catch (e: any) {
    console.error("[WORKSPACE][MEMBERS][PATCH_ROLE]", e);
    return res.status(500).json({ ok: false, error: e.message ?? "failed" });
  }
}

router.patch("/members/:userId/role", updateRoleHandler); // ✅ 프론트 계약
router.patch("/members/:userId", updateRoleHandler);      // ✅ 호환

/* =========================
   DELETE /api/workspace/members/:userId
========================= */
router.delete("/members/:userId", async (req: any, res) => {
  try {
    const ws = req.workspace?.id;
    const actorRole = req.workspace?.role;
    const actorId = getUserId(req);

    if (!ws) return res.status(400).json({ ok: false, error: "workspace_required" });
    if (!actorId) return res.status(401).json({ ok: false, error: "unauthorized" });

    // ✅ plan gate
    const { guard } = await assertTeamAllowed(ws);
    if (!guard.ok) return res.status(403).json({ ok: false, error: guard.error });

    // ✅ admin/owner only
    if (!WorkspaceAccess.isAdmin(actorRole)) {
      return res.status(403).json({ ok: false, error: "admin_required" });
    }

    const targetUserId = Number(req.params.userId);
    if (!Number.isFinite(targetUserId) || targetUserId <= 0) {
      return res.status(400).json({ ok: false, error: "invalid_userId" });
    }

    if (targetUserId === actorId) {
      return res.status(400).json({ ok: false, error: "cannot_remove_self" });
    }

    const ok = await WorkspaceTeamEngine.removeMember({
      workspaceId: ws,
      targetUserId,
    });

    return res.status(ok ? 200 : 404).json({ ok });
  } catch (e: any) {
    console.error("[WORKSPACE][MEMBERS][DELETE]", e);
    return res.status(500).json({ ok: false, error: e.message ?? "failed" });
  }
});

/* =========================
   POST /api/workspace/invitations/:id/revoke
========================= */
router.post("/invitations/:id/revoke", async (req: any, res) => {
  try {
    const ws = req.workspace?.id;
    const actorRole = req.workspace?.role;

    if (!ws) return res.status(400).json({ ok: false, error: "workspace_required" });

    // ✅ plan gate
    const { guard } = await assertTeamAllowed(ws);
    if (!guard.ok) return res.status(403).json({ ok: false, error: guard.error });

    // ✅ admin/owner only
    if (!WorkspaceAccess.isAdmin(actorRole)) {
      return res.status(403).json({ ok: false, error: "admin_required" });
    }

    const inviteId = String(req.params.id ?? "").trim();
    if (!inviteId) return res.status(400).json({ ok: false, error: "invalid_inviteId" });

    const ok = await WorkspaceTeamEngine.revokeInvite({
      workspaceId: ws,
      inviteId,
    });

    return res.status(ok ? 200 : 404).json({ ok });
  } catch (e: any) {
    console.error("[WORKSPACE][INVITE][REVOKE]", e);
    return res.status(500).json({ ok: false, error: e.message ?? "failed" });
  }
});

/* =========================
   POST /api/workspace/invitations/:id/approve
========================= */
router.post("/invitations/:id/approve", async (req: any, res) => {
  try {
    const ws = req.workspace?.id;
    const actorRole = req.workspace?.role;
    if (!ws) return res.status(400).json({ ok: false, error: "workspace_required" });

    const { guard } = await assertTeamAllowed(ws);
    if (!guard.ok) return res.status(403).json({ ok: false, error: guard.error });

    if (!WorkspaceAccess.isAdmin(actorRole)) {
      return res.status(403).json({ ok: false, error: "admin_required" });
    }

    const inviteId = String(req.params.id ?? "").trim();
    if (!inviteId) return res.status(400).json({ ok: false, error: "invalid_inviteId" });

    const r = await WorkspaceTeamEngine.approveInvite({
      workspaceId: ws,
      inviteId,
    });

    if (!r.ok) return res.status(404).json({ ok: false, error: r.error ?? "not_found" });
    return res.json({ ok: true });
  } catch (e: any) {
    console.error("[WORKSPACE][INVITE][APPROVE]", e);
    return res.status(500).json({ ok: false, error: e.message ?? "failed" });
  }
});

/* =========================
   GET /api/workspace/invite-link
========================= */
router.get("/invite-link", async (req: any, res) => {
  try {
    const ws = req.workspace?.id;
    if (!ws) return res.status(400).json({ ok: false, error: "workspace_required" });
    const tier = await WorkspacePlanService.getTier(ws);
    if (!isBusinessOrAbove(tier)) {
      return res.status(403).json({ ok: false, error: "plan_required" });
    }

    const link = await WorkspaceTeamEngine.getInviteLink(ws);
    return res.json({
      ok: true,
      link: link
        ? {
            token: link.token,
            maxUses: link.max_uses,
            uses: link.uses,
            expiresAt: link.expires_at ? new Date(link.expires_at).getTime() : null,
            role: link.role ?? "member",
          }
        : null,
    });
  } catch (e: any) {
    console.error("[WORKSPACE][INVITE_LINK][GET]", e);
    return res.status(500).json({ ok: false, error: e.message ?? "failed" });
  }
});

/* =========================
   POST /api/workspace/invite-link
========================= */
router.post("/invite-link", async (req: any, res) => {
  try {
    const ws = req.workspace?.id;
    const actorRole = req.workspace?.role;
    const userId = getUserId(req);
    if (!ws || !userId) return res.status(401).json({ ok: false, error: "unauthorized" });

    const tier = await WorkspacePlanService.getTier(ws);
    if (!isBusinessOrAbove(tier)) {
      return res.status(403).json({ ok: false, error: "plan_required" });
    }
    if (!WorkspaceAccess.isAdmin(actorRole)) {
      return res.status(403).json({ ok: false, error: "admin_required" });
    }

    const maxUses = Number(req.body?.maxUses ?? "");
    const expiresAtRaw = req.body?.expiresAt ? new Date(req.body.expiresAt) : null;
    const role = String(req.body?.role ?? "member");
    const link = await WorkspaceTeamEngine.createInviteLink({
      workspaceId: ws,
      createdByUserId: userId,
      maxUses: Number.isFinite(maxUses) && maxUses > 0 ? maxUses : null,
      expiresAt: expiresAtRaw && !Number.isNaN(expiresAtRaw.getTime()) ? expiresAtRaw : null,
      role: ["admin", "member", "viewer"].includes(role) ? (role as any) : "member",
    });
 if (!link) {
   return res.status(500).json({ ok: false, error: "invite_link_failed" });
 }

    return res.json({
      ok: true,
      link: {
        token: link.token,
        maxUses: link.max_uses,
        uses: link.uses,
        expiresAt: link.expires_at ? new Date(link.expires_at).getTime() : null,
        role: link.role ?? "member",
      },
    });
  } catch (e: any) {
    console.error("[WORKSPACE][INVITE_LINK][POST]", e);
    return res.status(500).json({ ok: false, error: e.message ?? "failed" });
  }
});

/* =========================
   POST /api/workspace/invite-link/rotate
========================= */
router.post("/invite-link/rotate", async (req: any, res) => {
  try {
    const ws = req.workspace?.id;
    const actorRole = req.workspace?.role;
    const userId = getUserId(req);
    if (!ws || !userId) return res.status(401).json({ ok: false, error: "unauthorized" });

    const tier = await WorkspacePlanService.getTier(ws);
    if (!isBusinessOrAbove(tier)) {
      return res.status(403).json({ ok: false, error: "plan_required" });
    }
    if (!WorkspaceAccess.isAdmin(actorRole)) {
      return res.status(403).json({ ok: false, error: "admin_required" });
    }

    const maxUses = Number(req.body?.maxUses ?? "");
    const expiresAtRaw = req.body?.expiresAt ? new Date(req.body.expiresAt) : null;
    const role = String(req.body?.role ?? "member");
    const link = await WorkspaceTeamEngine.rotateInviteLink({
      workspaceId: ws,
      createdByUserId: userId,
      maxUses: Number.isFinite(maxUses) && maxUses > 0 ? maxUses : null,
      expiresAt: expiresAtRaw && !Number.isNaN(expiresAtRaw.getTime()) ? expiresAtRaw : null,
      role: ["admin", "member", "viewer"].includes(role) ? (role as any) : "member",
    });

    return res.json({
      ok: true,
      link: {
        token: link.token,
        maxUses: link.max_uses,
        uses: link.uses,
        expiresAt: link.expires_at ? new Date(link.expires_at).getTime() : null,
        role: link.role ?? "member",
      },
    });
  } catch (e: any) {
    console.error("[WORKSPACE][INVITE_LINK][ROTATE]", e);
    return res.status(500).json({ ok: false, error: e.message ?? "failed" });
  }
});

/* =========================
   POST /api/workspace/join
========================= */
router.post("/join", async (req: any, res) => {
  try {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ ok: false, error: "unauthorized" });

    const token = String(req.body?.token ?? "").trim();
    if (!token || token.length !== 64) {
      return res.status(400).json({ ok: false, error: "invalid_token" });
    }

    const email = req.user?.email ?? null;
    const r = await WorkspaceTeamEngine.joinByInviteLink({ token, userId, email });
    if (!r.ok) return res.status(400).json({ ok: false, error: r.error });
    return res.json({ ok: true, status: r.status });
  } catch (e: any) {
    console.error("[WORKSPACE][JOIN]", e);
    return res.status(500).json({ ok: false, error: e.message ?? "failed" });
  }
});

/* =========================
   DOMAIN SETTINGS
========================= */
router.get("/domains", async (req: any, res) => {
  try {
    const ws = req.workspace?.id;
    if (!ws) return res.status(400).json({ ok: false, error: "workspace_required" });
    const tier = await WorkspacePlanService.getTier(ws);
    if (!isBusinessOrAbove(tier)) {
      return res.status(403).json({ ok: false, error: "plan_required" });
    }
    const items = await WorkspaceTeamEngine.listDomains(ws);
    return res.json({ ok: true, domains: items });
  } catch (e: any) {
    console.error("[WORKSPACE][DOMAINS][GET]", e);
    return res.status(500).json({ ok: false, error: e.message ?? "failed" });
  }
});

router.post("/domains", async (req: any, res) => {
  try {
    const ws = req.workspace?.id;
    const actorRole = req.workspace?.role;
    if (!ws) return res.status(400).json({ ok: false, error: "workspace_required" });
    const tier = await WorkspacePlanService.getTier(ws);
    if (!isBusinessOrAbove(tier)) {
      return res.status(403).json({ ok: false, error: "plan_required" });
    }
    if (!WorkspaceAccess.isAdmin(actorRole)) {
      return res.status(403).json({ ok: false, error: "admin_required" });
    }
    const domain = String(req.body?.domain ?? "").trim().toLowerCase();
    if (!domain || !domain.includes(".")) {
      return res.status(400).json({ ok: false, error: "invalid_domain" });
    }
    const autoJoin = Boolean(req.body?.autoJoin);
    const requiresApproval = Boolean(req.body?.requiresApproval);
    await WorkspaceTeamEngine.createDomain({
      workspaceId: ws,
      domain,
      autoJoin,
      requiresApproval,
    });
    const items = await WorkspaceTeamEngine.listDomains(ws);
    return res.json({ ok: true, domains: items });
  } catch (e: any) {
    console.error("[WORKSPACE][DOMAINS][POST]", e);
    return res.status(500).json({ ok: false, error: e.message ?? "failed" });
  }
});

router.patch("/domains/:id", async (req: any, res) => {
  try {
    const ws = req.workspace?.id;
    const actorRole = req.workspace?.role;
    if (!ws) return res.status(400).json({ ok: false, error: "workspace_required" });
    const tier = await WorkspacePlanService.getTier(ws);
    if (!isBusinessOrAbove(tier)) {
      return res.status(403).json({ ok: false, error: "plan_required" });
    }
    if (!WorkspaceAccess.isAdmin(actorRole)) {
      return res.status(403).json({ ok: false, error: "admin_required" });
    }
    const domainId = String(req.params.id ?? "").trim();
    const autoJoin = Boolean(req.body?.autoJoin);
    const requiresApproval = Boolean(req.body?.requiresApproval);
    const ok = await WorkspaceTeamEngine.updateDomain({
      workspaceId: ws,
      domainId,
      autoJoin,
      requiresApproval,
    });
    if (!ok) return res.status(404).json({ ok: false, error: "not_found" });
    const items = await WorkspaceTeamEngine.listDomains(ws);
    return res.json({ ok: true, domains: items });
  } catch (e: any) {
    console.error("[WORKSPACE][DOMAINS][PATCH]", e);
    return res.status(500).json({ ok: false, error: e.message ?? "failed" });
  }
});

router.delete("/domains/:id", async (req: any, res) => {
  try {
    const ws = req.workspace?.id;
    const actorRole = req.workspace?.role;
    if (!ws) return res.status(400).json({ ok: false, error: "workspace_required" });
    const tier = await WorkspacePlanService.getTier(ws);
    if (!isBusinessOrAbove(tier)) {
      return res.status(403).json({ ok: false, error: "plan_required" });
    }
    if (!WorkspaceAccess.isAdmin(actorRole)) {
      return res.status(403).json({ ok: false, error: "admin_required" });
    }
    const domainId = String(req.params.id ?? "").trim();
    const ok = await WorkspaceTeamEngine.deleteDomain({
      workspaceId: ws,
      domainId,
    });
    if (!ok) return res.status(404).json({ ok: false, error: "not_found" });
    const items = await WorkspaceTeamEngine.listDomains(ws);
    return res.json({ ok: true, domains: items });
  } catch (e: any) {
    console.error("[WORKSPACE][DOMAINS][DELETE]", e);
    return res.status(500).json({ ok: false, error: e.message ?? "failed" });
  }
});

/* =========================
   SSO SETTINGS
========================= */
router.get("/sso", async (req: any, res) => {
  try {
    const ws = req.workspace?.id;
    if (!ws) return res.status(400).json({ ok: false, error: "workspace_required" });
    const tier = await WorkspacePlanService.getTier(ws);
    if (!isEnterprise(tier)) {
      return res.status(403).json({ ok: false, error: "plan_required" });
    }
    const items = await WorkspaceTeamEngine.listSsoProviders(ws);
    return res.json({ ok: true, providers: items });
  } catch (e: any) {
    console.error("[WORKSPACE][SSO][GET]", e);
    return res.status(500).json({ ok: false, error: e.message ?? "failed" });
  }
});

router.post("/sso/connect", async (req: any, res) => {
  try {
    const ws = req.workspace?.id;
    const actorRole = req.workspace?.role;
    if (!ws) return res.status(400).json({ ok: false, error: "workspace_required" });
    const tier = await WorkspacePlanService.getTier(ws);
    if (!isEnterprise(tier)) {
      return res.status(403).json({ ok: false, error: "plan_required" });
    }
    if (!WorkspaceAccess.isAdmin(actorRole)) {
      return res.status(403).json({ ok: false, error: "admin_required" });
    }
    const provider = String(req.body?.provider ?? "").trim();
    const domain = String(req.body?.domain ?? "").trim().toLowerCase();
    if (!provider || !domain || !domain.includes(".")) {
      return res.status(400).json({ ok: false, error: "invalid_payload" });
    }
    await WorkspaceTeamEngine.connectSsoProvider({
      workspaceId: ws,
      provider,
      domain,
    });
    const items = await WorkspaceTeamEngine.listSsoProviders(ws);
    return res.json({ ok: true, providers: items });
  } catch (e: any) {
    console.error("[WORKSPACE][SSO][CONNECT]", e);
    return res.status(500).json({ ok: false, error: e.message ?? "failed" });
  }
});

router.patch("/sso/:id", async (req: any, res) => {
  try {
    const ws = req.workspace?.id;
    const actorRole = req.workspace?.role;
    if (!ws) return res.status(400).json({ ok: false, error: "workspace_required" });
    const tier = await WorkspacePlanService.getTier(ws);
    if (!isEnterprise(tier)) {
      return res.status(403).json({ ok: false, error: "plan_required" });
    }
    if (!WorkspaceAccess.isAdmin(actorRole)) {
      return res.status(403).json({ ok: false, error: "admin_required" });
    }
    const providerId = String(req.params.id ?? "").trim();
    const enabled = Boolean(req.body?.enabled);
    const ok = await WorkspaceTeamEngine.updateSsoProvider({
      workspaceId: ws,
      providerId,
      enabled,
    });
    if (!ok) return res.status(404).json({ ok: false, error: "not_found" });
    const items = await WorkspaceTeamEngine.listSsoProviders(ws);
    return res.json({ ok: true, providers: items });
  } catch (e: any) {
    console.error("[WORKSPACE][SSO][PATCH]", e);
    return res.status(500).json({ ok: false, error: e.message ?? "failed" });
  }
});

router.delete("/sso/:id", async (req: any, res) => {
  try {
    const ws = req.workspace?.id;
    const actorRole = req.workspace?.role;
    if (!ws) return res.status(400).json({ ok: false, error: "workspace_required" });
    const tier = await WorkspacePlanService.getTier(ws);
    if (!isEnterprise(tier)) {
      return res.status(403).json({ ok: false, error: "plan_required" });
    }
    if (!WorkspaceAccess.isAdmin(actorRole)) {
      return res.status(403).json({ ok: false, error: "admin_required" });
    }
    const providerId = String(req.params.id ?? "").trim();
    const ok = await WorkspaceTeamEngine.deleteSsoProvider({
      workspaceId: ws,
      providerId,
    });
    if (!ok) return res.status(404).json({ ok: false, error: "not_found" });
    const items = await WorkspaceTeamEngine.listSsoProviders(ws);
    return res.json({ ok: true, providers: items });
  } catch (e: any) {
    console.error("[WORKSPACE][SSO][DELETE]", e);
    return res.status(500).json({ ok: false, error: e.message ?? "failed" });
  }
});

/* =========================
   PERMISSIONS (Enterprise)
========================= */
router.get("/permissions", async (req: any, res) => {
  try {
    const ws = req.workspace?.id;
    if (!ws) return res.status(400).json({ ok: false, error: "workspace_required" });
    const tier = await WorkspacePlanService.getTier(ws);
    if (!isEnterprise(tier)) {
      return res.status(403).json({ ok: false, error: "plan_required" });
    }
    const data = await WorkspaceTeamEngine.listPermissions(ws);
    return res.json({ ok: true, ...data });
  } catch (e: any) {
    console.error("[WORKSPACE][PERMISSIONS][GET]", e);
    return res.status(500).json({ ok: false, error: e.message ?? "failed" });
  }
});

router.post("/permissions/roles", async (req: any, res) => {
  try {
    const ws = req.workspace?.id;
    const actorRole = req.workspace?.role;
    if (!ws) return res.status(400).json({ ok: false, error: "workspace_required" });
    const tier = await WorkspacePlanService.getTier(ws);
    if (!isEnterprise(tier)) {
      return res.status(403).json({ ok: false, error: "plan_required" });
    }
    if (!WorkspaceAccess.isAdmin(actorRole)) {
      return res.status(403).json({ ok: false, error: "admin_required" });
    }
    const key = String(req.body?.key ?? "").trim().toLowerCase();
    const name = String(req.body?.name ?? "").trim();
    if (!key || !name) return res.status(400).json({ ok: false, error: "invalid_payload" });
    await WorkspaceTeamEngine.createRole({ workspaceId: ws, key, name });
    const data = await WorkspaceTeamEngine.listPermissions(ws);
    return res.json({ ok: true, ...data });
  } catch (e: any) {
    console.error("[WORKSPACE][PERMISSIONS][ROLE][POST]", e);
    return res.status(500).json({ ok: false, error: e.message ?? "failed" });
  }
});

router.patch("/permissions/roles/:id", async (req: any, res) => {
  try {
    const ws = req.workspace?.id;
    const actorRole = req.workspace?.role;
    if (!ws) return res.status(400).json({ ok: false, error: "workspace_required" });
    const tier = await WorkspacePlanService.getTier(ws);
    if (!isEnterprise(tier)) {
      return res.status(403).json({ ok: false, error: "plan_required" });
    }
    if (!WorkspaceAccess.isAdmin(actorRole)) {
      return res.status(403).json({ ok: false, error: "admin_required" });
    }
    const roleId = String(req.params.id ?? "").trim();
    const permissionKeys = Array.isArray(req.body?.permissionKeys)
      ? req.body.permissionKeys.map((k: any) => String(k))
      : [];
    const ok = await WorkspaceTeamEngine.updateRolePermissions({
      roleId,
      permissionKeys,
    });
    if (!ok) return res.status(400).json({ ok: false, error: "update_failed" });
    const data = await WorkspaceTeamEngine.listPermissions(ws);
    return res.json({ ok: true, ...data });
  } catch (e: any) {
    console.error("[WORKSPACE][PERMISSIONS][ROLE][PATCH]", e);
    return res.status(500).json({ ok: false, error: e.message ?? "failed" });
  }
});

router.delete("/permissions/roles/:id", async (req: any, res) => {
  try {
    const ws = req.workspace?.id;
    const actorRole = req.workspace?.role;
    if (!ws) return res.status(400).json({ ok: false, error: "workspace_required" });
    const tier = await WorkspacePlanService.getTier(ws);
    if (!isEnterprise(tier)) {
      return res.status(403).json({ ok: false, error: "plan_required" });
    }
    if (!WorkspaceAccess.isAdmin(actorRole)) {
      return res.status(403).json({ ok: false, error: "admin_required" });
    }
    const roleId = String(req.params.id ?? "").trim();
    const ok = await WorkspaceTeamEngine.deleteRole({ roleId });
    if (!ok) return res.status(404).json({ ok: false, error: "not_found" });
    const data = await WorkspaceTeamEngine.listPermissions(ws);
    return res.json({ ok: true, ...data });
  } catch (e: any) {
    console.error("[WORKSPACE][PERMISSIONS][ROLE][DELETE]", e);
    return res.status(500).json({ ok: false, error: e.message ?? "failed" });
  }
});

/* =========================
   GET /api/workspace/info
   Returns workspace name, icon, tier, memberCount for settings page
========================= */
router.get("/info", async (req: any, res) => {
  try {
    const ws = req.workspace?.id;
    if (!ws) return res.status(400).json({ ok: false, error: "workspace_required" });

    // Safe read — name/icon columns may not exist yet
    let name: string | null = null;
    let icon: string | null = null;
    let type: string = "personal";
    try {
      const wRow = await pgPool.query<{
        name: string | null;
        icon: string | null;
        type: string;
      }>(
        `SELECT name, icon, type FROM workspaces WHERE id = $1 LIMIT 1`,
        [ws]
      );
      if (wRow.rows[0]) {
        name = wRow.rows[0].name;
        icon = wRow.rows[0].icon;
        type = wRow.rows[0].type;
      }
    } catch {
      // columns may not exist — fallback
      const wRow = await pgPool.query<{ type: string }>(
        `SELECT type FROM workspaces WHERE id = $1 LIMIT 1`,
        [ws]
      );
      type = wRow.rows[0]?.type ?? "personal";
    }

    const tier = await WorkspacePlanService.getTier(ws);

    const memberCount = await pgPool.query<{ count: string }>(
      `SELECT count(*)::text AS count FROM workspace_users WHERE workspace_id = $1`,
      [ws]
    );

    return res.json({
      ok: true,
      workspace: {
        id: ws,
        name: (name ?? "").trim() || (type === "personal" ? "Personal Workspace" : "Workspace"),
        icon: icon ?? null,
        tier,
        memberCount: parseInt(memberCount.rows[0]?.count ?? "0", 10),
      },
    });
  } catch (e: any) {
    console.error("[WORKSPACE][INFO]", e);
    return res.status(500).json({ ok: false, error: e.message ?? "failed" });
  }
});

/* =========================
   PATCH /api/workspace/settings
   Update workspace name/icon. Owner/admin only.
========================= */
router.patch("/settings", async (req: any, res) => {
  try {
    const ws = req.workspace?.id;
    const actorRole = req.workspace?.role;
    const userId = getUserId(req);
    if (!ws || !userId) return res.status(401).json({ ok: false, error: "unauthorized" });

    if (!WorkspaceAccess.isAdmin(actorRole)) {
      return res.status(403).json({ ok: false, error: "admin_required" });
    }

    const nameRaw = req.body?.name != null ? String(req.body.name).trim() : undefined;
    const iconRaw = req.body?.icon != null ? String(req.body.icon).trim() : undefined;

    if (nameRaw === undefined && iconRaw === undefined) {
      return res.status(400).json({ ok: false, error: "name_or_icon_required" });
    }

    // Build dynamic SET clause
    const sets: string[] = [];
    const vals: any[] = [];
    let idx = 1;

    if (nameRaw !== undefined) {
      const name = nameRaw.slice(0, 100);
      if (!name) return res.status(400).json({ ok: false, error: "name_cannot_be_empty" });
      sets.push(`name = $${idx++}`);
      vals.push(name);
    }

    if (iconRaw !== undefined) {
      sets.push(`icon = $${idx++}`);
      vals.push(iconRaw || null);
    }

    vals.push(ws);

    const updated = await pgPool.query<{
      id: string;
      name: string | null;
      icon: string | null;
    }>(
      `UPDATE workspaces SET ${sets.join(", ")} WHERE id = $${idx} RETURNING id, name, icon`,
      vals
    );

    if (!updated.rows[0]) {
      return res.status(404).json({ ok: false, error: "workspace_not_found" });
    }

    return res.json({ ok: true, workspace: updated.rows[0] });
  } catch (e: any) {
    console.error("[WORKSPACE][SETTINGS][PATCH]", e);
    return res.status(500).json({ ok: false, error: e.message ?? "failed" });
  }
});

/* =========================
   DELETE /api/workspace/docs/:docId
   Soft-delete a document
========================= */
router.delete("/docs/:docId", async (req: any, res) => {
  try {
    const ws = req.workspace?.id;
    const userId = getUserId(req);
    if (!ws || !userId) return res.status(401).json({ ok: false, error: "unauthorized" });

    const docId = String(req.params.docId ?? "").trim();
    if (!isUuid(docId)) return res.status(400).json({ ok: false, error: "invalid_doc_id" });

    const role = await WorkspaceAccess.getRole(ws, userId);
    if (!role || role === "viewer") {
      return res.status(403).json({ ok: false, error: "write_permission_required" });
    }

    const result = await pgPool.query(
      `
        UPDATE workspace_docs
        SET deleted_at = now()
        WHERE id = $1
          AND workspace_id = $2
          AND deleted_at IS NULL
        RETURNING id
      `,
      [docId, ws]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ ok: false, error: "doc_not_found" });
    }

    return res.json({ ok: true });
  } catch (e: any) {
    console.error("[WORKSPACE][DOCS][DELETE]", e);
    return res.status(500).json({ ok: false, error: e.message ?? "failed" });
  }
});

export default router;
