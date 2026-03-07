// 📂 src/control/yua/spine-controller.ts
import { Request, Response } from "express";
import { YuaOmegaLite } from "../../ai/yua/yua-omega-lite";
import { runQuantumEngineV2 } from "../../ai/quantum/quantum-engine-v2";

export const spineController = {
  async run(req: Request, res: Response) {
    const messages = req.body?.messages ?? [];
    const text = messages[messages.length - 1]?.content ?? "";

    const omega = new YuaOmegaLite();
    const omegaOut = await omega.run(text); // ← process()가 아니라 run()

    const quantumOut = await runQuantumEngineV2(text);

    return res.json({
      ok: true,
      engine: "spine",
      omega: omegaOut,
      quantum: quantumOut
    });
  }
};
