// 📂 src/control/chat-stream-controller.ts

import { Request, Response } from "express";
import { RoutingEngine } from "../ai/engines/routing-engine";
import { MessageEngine } from "../ai/engines/message-engine";

export const chatStreamController = {
  stream: async (req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const message = String(req.query.message ?? "");
    const threadId = Number(req.query.threadId);
    const apiKey = req.headers["x-api-key"] as string | undefined;

    if (!message.trim()) {
      res.write(`data: ${JSON.stringify({ error: "message required" })}\n\n`);
      return res.end();
    }

    if (!threadId || Number.isNaN(threadId)) {
      res.write(`data: ${JSON.stringify({ error: "threadId required" })}\n\n`);
      return res.end();
    }

    let buffer = "";

    try {
      const stream = await RoutingEngine.route({
        type: "chat-stream",
        data: { message },
        apiKey,
        ip: req.ip,
        userType: "individual",
      });

      for await (const delta of stream as AsyncIterable<string>) {
        buffer += delta;
        res.write(`data: ${JSON.stringify({ token: delta })}\n\n`);
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    } catch (err: any) {
      // Abort / network error 포함
      res.write(
        `data: ${JSON.stringify({ done: true, aborted: true })}\n\n`
      );
    } finally {
      // ⭐ 핵심: 중단 여부 상관없이 buffer 저장
      if (buffer.trim().length > 0) {
        await MessageEngine.addMessage({
          threadId,
          userId: 0, // system userId (stream response)
          role: "assistant",
          content: buffer,
          model: "gpt-4.1-mini",
        });
      }

      res.end();
    }
  },
};
