// 🔥 AgentController — INSTANCE AWARE FINAL

import { Request, Response } from "express";
import { AutoAgentEngine } from "../ai/agent/auto-agent-engine";

export const agentController = {
  async run(req: Request, res: Response): Promise<Response> {
    try {
      const { instanceId, message, context } = req.body ?? {};
      const userId = (req as any).user?.id ?? null;

      if (!instanceId) {
        return res.status(400).json({
          ok: false,
          error: "instanceId is required",
        });
      }

      if (!message) {
        return res.status(400).json({
          ok: false,
          error: "message is required",
        });
      }

      const output = await AutoAgentEngine.run({
        instanceId,
        message,
        userId,
        context,
      });

      return res.status(200).json({
        ok: true,
        engine: "agent",
        instanceId,
        output,
      });
    } catch (err: any) {
      return res.status(500).json({
        ok: false,
        engine: "agent-error",
        error: String(err?.message ?? err),
      });
    }
  },
};
