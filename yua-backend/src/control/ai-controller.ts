// 📂 src/controllers/ai-controller.ts
// 🔥 AIController — INSTANCE FIRST / SSOT FINAL

import { Request, Response } from "express";
import { RoutingEngine } from "../ai/engines/routing-engine";
import { LoggingEngine } from "../ai/engines/logging-engine";

export const aiController = {
  universal: async (req: Request, res: Response): Promise<Response> => {
    const startedAt = Date.now();
    const body = req.body ?? {};

    const type: string | undefined = body.type;
    const payload: any = body.payload ?? {};
    const instanceId: string | undefined = body.instanceId;

    try {
      // --------------------------------------------------
      // 1) 필수 필드
      // --------------------------------------------------
      if (!type || !instanceId) {
        return res.status(400).json({
          ok: false,
          error: "type 또는 instanceId 누락",
        });
      }

      // --------------------------------------------------
      // 2) RoutingEngine 위임 (SSOT)
      // --------------------------------------------------
      const result = await RoutingEngine.route({
        type,
        data: payload,
        instanceId,
        apiKey: body.apiKey,
        userType: body.userType,
        ip: req.ip,
      });

      // --------------------------------------------------
      // 3) 결과 처리
      // --------------------------------------------------
      if (!result?.ok) {
        await LoggingEngine.record({
          route: "ai/universal",
          instanceId,
          method: "POST",
          status: "error",
          request: body,
          response: result,
          latency: Date.now() - startedAt,
        });

        return res.status(400).json(result);
      }

      await LoggingEngine.record({
        route: "ai/universal",
        instanceId,
        method: "POST",
        status: "success",
        request: body,
        response: result,
        latency: Date.now() - startedAt,
      });

      return res.json({ ok: true, result });
    } catch (e: any) {
      const response = {
        ok: false,
        error: String(e),
      };

      await LoggingEngine.record({
        route: "ai/universal",
        instanceId,
        method: "POST",
        status: "error",
        error: String(e),
        request: body,
        response,
        latency: Date.now() - startedAt,
      });

      return res.status(500).json(response);
    }
  },
};
