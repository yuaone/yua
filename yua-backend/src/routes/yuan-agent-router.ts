// src/routes/yuan-agent-router.ts
// YUAN Coding Agent API Router (SSOT)
//
// POST /api/yuan-agent/run      -> Start agent execution (returns sessionId)
// GET  /api/yuan-agent/stream   -> SSE streaming (realtime events)
// POST /api/yuan-agent/approve  -> Approval response (approve/reject)
// GET  /api/yuan-agent/sessions -> Session list
// POST /api/yuan-agent/stop     -> Stop agent
// GET  /api/yuan-agent/session/:id -> Session detail

import { Router, Request, Response } from "express";
import {
  AgentSessionManager,
  type AgentEvent,
  type AgentSessionStatus,
} from "../agent/agent-session-manager";

const router = Router();

/* ==================================================
   POST /run — Start agent execution
================================================== */
router.post("/run", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const workspaceId = req.workspace?.id;

    if (!userId || !workspaceId) {
      res.status(401).json({ ok: false, error: "auth_required" });
      return;
    }

    const { prompt, workDir, model, provider, maxIterations } = req.body ?? {};

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      res.status(400).json({ ok: false, error: "prompt is required" });
      return;
    }

    // Plan limits check
    const plan = req.subscription?.plan ?? "free";
    const limits = AgentSessionManager.getPlanLimits(plan);

    // Concurrent session check
    const activeCount = AgentSessionManager.getActiveCount(userId);
    if (limits.maxConcurrent > 0 && activeCount >= limits.maxConcurrent) {
      res.status(429).json({
        ok: false,
        error: "concurrent_session_limit",
        message: `Plan "${plan}" allows max ${limits.maxConcurrent} concurrent sessions. Currently active: ${activeCount}`,
      });
      return;
    }

    // Create session
    const session = AgentSessionManager.createSession({
      userId,
      workspaceId,
      prompt: prompt.trim(),
      model: typeof model === "string" ? model : undefined,
      provider: typeof provider === "string" ? provider : undefined,
      workDir: typeof workDir === "string" ? workDir : undefined,
      maxIterations:
        typeof maxIterations === "number"
          ? Math.min(maxIterations, limits.maxIterations)
          : limits.maxIterations,
    });

    // Start agent loop asynchronously (non-blocking)
    // The actual agent loop implementation will be injected later (Phase 1 Batch 3)
    // For now, transition to "running" and emit a placeholder event
    setImmediate(() => {
      AgentSessionManager.updateStatus(session.id, "running");

      AgentSessionManager.emitEvent(session.id, {
        kind: "agent:thinking",
        runId: session.runId,
        data: { message: "Analyzing prompt and planning execution..." },
      });

      // TODO: Replace with actual AgentLoop.start() in T3.1
      // The agent loop will:
      // 1. Parse the prompt → create execution plan
      // 2. Execute tools in a loop (read → edit → shell → verify)
      // 3. Emit events via AgentSessionManager.emitEvent()
      // 4. Request approval via AgentSessionManager.setPendingApproval()
      // 5. Update status on completion/failure
    });

    res.status(200).json({
      ok: true,
      sessionId: session.id,
      runId: session.runId,
      status: "started" as const,
      streamUrl: `/api/yuan-agent/stream?sessionId=${session.id}`,
    });
  } catch (err: any) {
    console.error("[YUAN_AGENT] /run error:", err);
    res.status(500).json({
      ok: false,
      error: "internal_error",
      message: err?.message ?? "Failed to start agent",
    });
  }
});

/* ==================================================
   GET /stream?sessionId=<id> — SSE streaming
================================================== */
router.get("/stream", async (req: Request, res: Response) => {
  const sessionId = req.query.sessionId;

  if (typeof sessionId !== "string" || !sessionId) {
    res.status(400).json({ ok: false, error: "sessionId required" });
    return;
  }

  const session = AgentSessionManager.getSession(sessionId);
  if (!session) {
    res.status(404).json({ ok: false, error: "session_not_found" });
    return;
  }

  // Verify ownership
  const userId = req.user?.userId;
  if (session.userId !== userId) {
    res.status(403).json({ ok: false, error: "forbidden" });
    return;
  }

  /* ---------- SSE Headers ---------- */
  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders();
  res.write(Buffer.from(`: yuan-agent-stream-start\n\n`, "utf-8"));

  /* ---------- Replay buffered events ---------- */
  const lastEventId = req.headers["last-event-id"];
  const replayFrom =
    typeof lastEventId === "string" ? parseInt(lastEventId, 10) : 0;

  let eventSeq = 0;
  for (const buffered of session.eventBuffer) {
    eventSeq++;
    if (eventSeq <= replayFrom) continue;
    const sseFrame = `id: ${eventSeq}\nevent: ${buffered.kind}\ndata: ${JSON.stringify(buffered)}\n\n`;
    res.write(Buffer.from(sseFrame, "utf-8"));
  }

  /* ---------- Keep alive ---------- */
  const keepAlive = setInterval(() => {
    try {
      res.write(Buffer.from(`: ping ${Date.now()}\n\n`, "utf-8"));
    } catch {
      /* ignore */
    }
  }, 15000);

  /* ---------- Cleanup ---------- */
  let closed = false;

  const cleanup = (reason: string) => {
    if (closed) return;
    closed = true;
    clearInterval(keepAlive);
    session.emitter.removeListener("event", onEvent);
    try {
      res.end();
    } catch {
      /* ignore */
    }
    console.log("[YUAN_AGENT][SSE] Closed:", { sessionId, reason });
  };

  res.on("close", () => cleanup("client_close"));
  res.on("error", () => cleanup("response_error"));

  /* ---------- Subscribe to live events ---------- */
  const onEvent = (event: AgentEvent) => {
    if (closed) return;
    eventSeq++;
    try {
      const sseFrame = `id: ${eventSeq}\nevent: ${event.kind}\ndata: ${JSON.stringify(event)}\n\n`;
      res.write(Buffer.from(sseFrame, "utf-8"));

      // Close stream on terminal events
      if (event.kind === "agent:done") {
        cleanup("done");
      }
    } catch {
      cleanup("write_error");
    }
  };

  session.emitter.on("event", onEvent);

  // If session already in terminal state, send done and close
  const terminalStates: AgentSessionStatus[] = ["completed", "failed", "stopped"];
  if (terminalStates.includes(session.status)) {
    const doneEvent: AgentEvent = {
      kind: "agent:done",
      sessionId,
      runId: session.runId,
      timestamp: Date.now(),
      data: { status: session.status, error: session.error },
    };
    eventSeq++;
    const sseFrame = `id: ${eventSeq}\nevent: ${doneEvent.kind}\ndata: ${JSON.stringify(doneEvent)}\n\n`;
    res.write(Buffer.from(sseFrame, "utf-8"));
    cleanup("already_terminal");
  }
});

/* ==================================================
   POST /approve — Approval response
================================================== */
router.post("/approve", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ ok: false, error: "auth_required" });
      return;
    }

    const { sessionId, actionId, response } = req.body ?? {};

    if (!sessionId || typeof sessionId !== "string") {
      res.status(400).json({ ok: false, error: "sessionId is required" });
      return;
    }
    if (!actionId || typeof actionId !== "string") {
      res.status(400).json({ ok: false, error: "actionId is required" });
      return;
    }

    const validResponses = ["approve", "reject", "always_approve"] as const;
    if (!response || !validResponses.includes(response)) {
      res.status(400).json({
        ok: false,
        error: `response must be one of: ${validResponses.join(", ")}`,
      });
      return;
    }

    const session = AgentSessionManager.getSession(sessionId);
    if (!session) {
      res.status(404).json({ ok: false, error: "session_not_found" });
      return;
    }

    // Verify ownership
    if (session.userId !== userId) {
      res.status(403).json({ ok: false, error: "forbidden" });
      return;
    }

    const resolved = AgentSessionManager.resolveApproval(
      sessionId,
      actionId,
      response as "approve" | "reject" | "always_approve"
    );

    if (!resolved) {
      res.status(409).json({
        ok: false,
        error: "no_pending_approval",
        message: "No pending approval matching the given actionId",
      });
      return;
    }

    res.status(200).json({
      ok: true,
      sessionId,
      actionId,
      response,
    });
  } catch (err: any) {
    console.error("[YUAN_AGENT] /approve error:", err);
    res.status(500).json({ ok: false, error: "internal_error" });
  }
});

/* ==================================================
   GET /sessions — List user sessions
================================================== */
router.get("/sessions", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ ok: false, error: "auth_required" });
      return;
    }

    const sessions = AgentSessionManager.listSessions(userId);
    const serialized = sessions.map((s) =>
      AgentSessionManager.serializeSession(s)
    );

    res.status(200).json({
      ok: true,
      sessions: serialized,
      count: serialized.length,
    });
  } catch (err: any) {
    console.error("[YUAN_AGENT] /sessions error:", err);
    res.status(500).json({ ok: false, error: "internal_error" });
  }
});

/* ==================================================
   GET /session/:id — Session detail
================================================== */
router.get("/session/:id", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ ok: false, error: "auth_required" });
      return;
    }

    const session = AgentSessionManager.getSession(req.params.id);
    if (!session) {
      res.status(404).json({ ok: false, error: "session_not_found" });
      return;
    }

    if (session.userId !== userId) {
      res.status(403).json({ ok: false, error: "forbidden" });
      return;
    }

    res.status(200).json({
      ok: true,
      session: AgentSessionManager.serializeSession(session),
    });
  } catch (err: any) {
    console.error("[YUAN_AGENT] /session/:id error:", err);
    res.status(500).json({ ok: false, error: "internal_error" });
  }
});

/* ==================================================
   POST /stop — Stop agent execution
================================================== */
router.post("/stop", async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ ok: false, error: "auth_required" });
      return;
    }

    const { sessionId } = req.body ?? {};
    if (!sessionId || typeof sessionId !== "string") {
      res.status(400).json({ ok: false, error: "sessionId is required" });
      return;
    }

    const session = AgentSessionManager.getSession(sessionId);
    if (!session) {
      res.status(404).json({ ok: false, error: "session_not_found" });
      return;
    }

    if (session.userId !== userId) {
      res.status(403).json({ ok: false, error: "forbidden" });
      return;
    }

    const stopped = AgentSessionManager.stopSession(sessionId);
    if (!stopped) {
      res.status(409).json({
        ok: false,
        error: "session_not_active",
        message: `Session is in "${session.status}" state and cannot be stopped`,
      });
      return;
    }

    res.status(200).json({
      ok: true,
      sessionId,
      status: "stopped",
    });
  } catch (err: any) {
    console.error("[YUAN_AGENT] /stop error:", err);
    res.status(500).json({ ok: false, error: "internal_error" });
  }
});

export default router;
