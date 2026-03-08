// 📂 src/routes/stream-router.ts
import { Router, Request, Response } from "express";
import { StreamEngine } from "../ai/engines/stream-engine";
import { requireAuthOrApiKey } from "../auth/auth-or-apikey";
import type { YuaStreamEvent } from "../types/stream";
import { composeResponse } from "../ai/response/response-composer";

const router = Router();

router.get(
  "/stream",
  requireAuthOrApiKey,
    async (req: Request, res: Response) => {
    const rawThreadId = req.query.threadId;
    const threadId =
      typeof rawThreadId === "string" && rawThreadId.trim() !== ""
        ? Number(rawThreadId)
        : NaN;

console.log("[SSE][ENTER]", {
  rawThreadId,
  userId: req.user?.userId ?? null,
  role: req.user?.role ?? null,
  ip: req.ip,
});

    if (!Number.isFinite(threadId)) {
      res.status(400).json({ error: "threadId required" });
      return;
    }

    /* =========================
       SSE HEADERS
    ========================= */
    res.writeHead(200, {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    res.flushHeaders();
    res.write(Buffer.from(`: stream-start\n\n`, "utf-8"));

    /* =========================
       KEEP ALIVE
    ========================= */
    const keepAlive = setInterval(() => {
      try {
        res.write(Buffer.from(`: ping ${Date.now()}\n\n`, "utf-8"));
      } catch {}
    }, 15000);

    /* =========================
       CLEANUP (SSOT)
    ========================= */
    let closed = false;

    const cleanup = (reason: string) => {
      if (closed) return;
      closed = true;

      console.log("[SSE][CLEANUP_START]", { threadId, reason });
      console.log("[SSE][CLEANUP]", { threadId, reason });

      clearInterval(keepAlive);

      try {
        res.end();
      } catch {}

      console.log("[SSE][CLEANUP_DONE]", { threadId, reason });
    };

    res.on("close", () => {
      console.log("[SSE][RES_CLOSED]", { threadId });
      cleanup("client_close");
    });
    res.on("error", () => cleanup("response_error"));

    /* =========================
       SUBSCRIBE
    ========================= */
    try {
      const stream = StreamEngine.subscribe(threadId);

      for await (const rawEvent of stream as AsyncGenerator<YuaStreamEvent>) {

        // 🔒 SSOT: StreamEngine가 확정한 event 그대로 중계
        // 🔥 UTF-8 FIX: single atomic write to prevent multi-byte character
        // splits at chunk boundaries (Korean = 3 bytes per char in UTF-8).
        // Two separate res.write() calls can be flushed independently,
        // causing the client's ReadableStream to receive partial UTF-8 bytes.
        const sseFrame = `event: ${rawEvent.event}\ndata: ${JSON.stringify(rawEvent)}\n\n`;
        res.write(Buffer.from(sseFrame, "utf-8"));

        console.log("[SSE][EVENT]", {
          threadId,
          event: rawEvent.event,
          final: rawEvent.final === true,
          done: rawEvent.done === true,
        });



        /* =========================
           ❗ DONE만 SSE 종료
        ========================= */
        if (rawEvent.done === true) {
          console.log("[SSE][DONE_RECEIVED]", { threadId });
          cleanup("done");
          return;
        }
      }

      cleanup("stream_exhausted");
    } catch (err: any) {
      console.error("[SSE][STREAM_ERROR]", err);

      try {
        const errorFrame = `event: error\ndata: ${JSON.stringify({
          error: err?.message ?? "stream error",
        })}\n\n`;
        res.write(Buffer.from(errorFrame, "utf-8"));
      } catch {}

      cleanup("exception");
    }
  }
);

export default router;
