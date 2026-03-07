import { Request, Response } from "express";
import { RoutingEngine } from "../ai/engines/routing-engine";

export const spineStreamController = {
  stream: async (req: Request, res: Response) => {
    try {
      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const message = req.query.message as string;

      if (!message) {
        res.write(`data: ${JSON.stringify({ error: "message required" })}\n\n`);
        return res.end();
      }

      // RoutingEngine → spine-stream
      const generator = await RoutingEngine.route({
        type: "spine-stream",
        data: { message },
        ip: req.ip,
        userType: "developer"
      });

      for await (const chunk of generator) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (err: any) {
      res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    }
  }
};
