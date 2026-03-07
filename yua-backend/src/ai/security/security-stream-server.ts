// 📂 src/ai/security/security-stream-server.ts
// 🔥 SSE Security Stream Server — FINAL FIXED

import { EventEmitter } from "events";
import { Request, Response } from "express";
import { SecurityStreamEvent } from "./security-stream-events";

export const StreamBus = new EventEmitter();
StreamBus.setMaxListeners(2000);

export interface SecurityStreamClient {
  id: number;
  res: Response;
}

export const SecurityStreamServer = {
  clients: new Set<SecurityStreamClient>(),

  init(app: any) {
    app.get("/stream/security", (req: Request, res: Response): void => {
      // SSE header
      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders?.();

      const client: SecurityStreamClient = { id: Date.now(), res };
      this.clients.add(client);

      // Initial message
      res.write(
        `data: ${JSON.stringify({
          type: "system",
          message: "connected",
        })}\n\n`
      );

      // Heartbeat
      const heartbeat = setInterval(() => {
        if (!res.closed) {
          res.write(
            `data: ${JSON.stringify({
              type: "system",
              message: "heartbeat",
            })}\n\n`
          );
        }
      }, 10000);

      // Main event handler
      const handler = (event: SecurityStreamEvent) => {
        try {
          if (!res.closed) {
            res.write(`data: ${JSON.stringify(event)}\n\n`);
          }
        } catch (err) {
          console.error("[StreamServer] Write error:", err);
        }
      };

      StreamBus.on("security_event", handler);

      const cleanup = () => {
        clearInterval(heartbeat);
        StreamBus.removeListener("security_event", handler);
        this.clients.delete(client);
        res.end();
      };

      req.on("close", cleanup);
      req.on("error", cleanup);
    });
  },

  broadcast(event: SecurityStreamEvent) {
    for (const c of this.clients) {
      try {
        c.res.write(`data: ${JSON.stringify(event)}\n\n`);
      } catch (err) {
        console.error("[StreamServer] broadcast error:", err);
      }
    }
  },
};
