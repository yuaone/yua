// 📂 src/control/yua/pro-controller.ts
import { Request, Response } from "express";
import { runHPE7 } from "../../ai/hpe/hpe7/hpe7-engine";
import { MemoryManager } from "../../ai/memory/legacy-memory-adapter";

export const proController = {
  async run(req: Request, res: Response) {
    const messages = req.body?.messages ?? [];
    const last = messages[messages.length - 1]?.content ?? "";

    // ✅ 올바른 메모리 API
    const recentMemory = MemoryManager.getRecentHPEMemory(6);

    const hpeOut = await runHPE7({
      text: last,
      sessionId: "pro-engine"
    });

    return res.json({
      ok: true,
      engine: "pro",
      memory: recentMemory,
      hpe: hpeOut
    });
  }
};
