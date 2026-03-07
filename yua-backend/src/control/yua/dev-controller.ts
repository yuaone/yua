// 📂 src/control/yua/dev-controller.ts
import { Request, Response } from "express";
import { ChatEngine } from "../../ai/engines/chat-engine";

export const devController = {
  async run(req: Request, res: Response) {
    const messages = req.body?.messages ?? [];
    const last = messages[messages.length - 1]?.content ?? "";

    const result = await ChatEngine.generateResponse(last, { role: "developer" });

    return res.json(result);
  }
};
