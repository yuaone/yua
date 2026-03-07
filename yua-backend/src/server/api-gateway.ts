/**
 * @openapi
 * /api/yua:
 *   post:
 *     summary: Chat request to YUA ONE Engine
 *     description: Routes requests to Chat, Report, Risk, Spine-Stream, Quantum, etc.
 *     tags:
 *       - Chat
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 example: chat
 *               data:
 *                 type: object
 *                 properties:
 *                   prompt:
 *                     type: string
 *                     example: "안녕!"
 *     responses:
 *       200:
 *         description: Chat or Engine response from YUA ONE
 */

import { Request, Response } from "express";

import { SafetyEngine } from "../ai/engines/safety-engine";
import { ValidationEngine } from "../ai/engines/validation-engine";
import { RoutingEngine } from "../ai/engines/routing-engine";
import { LoggingEngine } from "../ai/engines/logging-engine";

export const AiGateway = {
  async handle(req: Request, res: Response) {
    const start = Date.now();
    const ip = req.ip || "unknown";

    try {
      // ----------------------------------------------------
      // 1) Validation
      // ----------------------------------------------------
      const has = ValidationEngine.requireKeys(req.body, ["type", "data"]);
      if (!has.ok) {
        return res.status(400).json({
          ok: false,
          engine: "gateway-error",
          error: has.error,
        });
      }

      // ----------------------------------------------------
      // 2) API KEY GET — FIXED
      // ----------------------------------------------------
      const apiKey: string | undefined =
        (req.headers["x-api-key"] as string) ||
        (req.headers["x-openai-key"] as string) ||
        undefined;

      // ----------------------------------------------------
      // 3) Safety 검사
      // ----------------------------------------------------
      const safety = SafetyEngine.analyzeUnsafe(
        JSON.stringify(req.body.data || "")
      );

      if (safety.blocked) {
        await LoggingEngine.record({
          route: "/api/yua",
          method: "POST",
          ip,
          apiKey,
          userType: req.body.data?.userType,
          request: req.body,
          response: safety,
          error: safety.reason,
          latency: Date.now() - start,
        });

        return res.status(403).json({
          ok: false,
          engine: "safety",
          blocked: true,
          reason: safety.reason,
        });
      }

      // ----------------------------------------------------
      // 4) RoutingEngine 실행
      // ----------------------------------------------------
      const result = await RoutingEngine.route({
        type: req.body.type,
        data: req.body.data,
        apiKey,
        userType: req.body.data?.userType,
        ip,
      });

      // ----------------------------------------------------
      // 5) LoggingEngine 기록
      // ----------------------------------------------------
      await LoggingEngine.record({
        route: "/api/yua",
        method: "POST",
        ip,
        apiKey,
        userType: req.body.data?.userType,
        request: req.body,
        response: result,
        latency: Date.now() - start,
      });

      return res.json(result);
    } catch (err: any) {
      // ----------------------------------------------------
      // 6) Fatal Error Logging
      // ----------------------------------------------------
      await LoggingEngine.record({
        route: "/api/yua",
        method: "POST",
        ip,
        apiKey: undefined, // null 금지
        userType: req.body?.data?.userType,
        request: req.body,
        response: null,
        error: err?.message || String(err),
        latency: Date.now() - start,
      });

      return res.status(500).json({
        ok: false,
        engine: "gateway-fatal",
        error: err?.message || String(err),
      });
    }
  },
};
