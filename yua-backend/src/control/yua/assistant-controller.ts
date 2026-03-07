// 📂 src/control/yua/assistant-controller.ts
import { Request, Response } from "express";
import { ChatEngine } from "../../ai/engines/chat-engine";

export const assistantController = {
  async run(req: Request, res: Response) {
    const messages = req.body?.messages ?? [];
    const last = messages[messages.length - 1]?.content ?? "";

    const out = await ChatEngine.generateResponse(last, { role: "assistant" });

    return res.json(out);
  }
};
