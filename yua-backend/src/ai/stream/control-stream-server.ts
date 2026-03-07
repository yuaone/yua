// 📂 src/ai/stream/control-stream-server.ts
// 🎮 3D Control Room Stream Server — Enterprise Version
// -----------------------------------------------------------
// ✔ Multi-client SSE broadcast
// ✔ heartbeat (10초)
// ✔ connection leak 방지
// ✔ listener limit 확대
// ✔ 안정적 stream write
// ✔ 컨트롤룸 제스처/동작 실시간 전송
// -----------------------------------------------------------

import { EventEmitter } from "events";
import type { Express, Request, Response } from "express";
import { ControlStreamEvent } from "./control-stream-events";

export const ControlStreamBus = new EventEmitter();
ControlStreamBus.setMaxListeners(1000); // 기본 10 → 1000으로 확장

export const ControlStreamServer = {
  clients: new Set<{ id: number; res: Response }>(),

  init(app: Express) {
    app.get("/stream/control", (req: Request, res: Response) => {
      // SSE Header
      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("X-Accel-Buffering", "no");

      res.flushHeaders?.();

      const client = { id: Date.now(), res };
      this.clients.add(client);

      // 초기 연결 알림
      res.write(
        `data: ${JSON.stringify({
          type: "system",
          message: "control_stream_connected",
          timestamp: new Date().toISOString(),
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

      // 이벤트 핸들러
      const handler = (event: ControlStreamEvent) => {
        try {
          if (!res.closed) {
            res.write(`data: ${JSON.stringify(event)}\n\n`);
          }
        } catch (err) {
          console.error("[ControlStreamServer] Write error:", err);
        }
      };

      ControlStreamBus.on("control_event", handler);

      // 연결 종료 처리
      const cleanup = () => {
        clearInterval(heartbeat);
        ControlStreamBus.removeListener("control_event", handler);
        this.clients.delete(client);
        res.end();
      };

      req.on("close", cleanup);
      req.on("error", cleanup);
    });
  },

  // 전체 클라이언트 브로드캐스트
  broadcast(event: ControlStreamEvent) {
    for (const client of this.clients) {
      try {
        client.res.write(`data: ${JSON.stringify(event)}\n\n`);
      } catch (err) {
        console.error("[ControlStreamServer] broadcast error:", err);
      }
    }
  },
};
