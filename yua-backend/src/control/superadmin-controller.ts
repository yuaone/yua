// 📂 src/control/superadmin-controller.ts
// 🔥 YUA-AI SuperAdmin Controller — FINAL BUILD PASS

import { Router } from "express";

import { MathEngine } from "../ai/engines/math-engine";
import { ChatEngine } from "../ai/engines/chat-engine";
import { RiskEngine } from "../ai/engines/risk-engine";
import { PatternEngine } from "../ai/engines/pattern-engine";
import { MatchEngine } from "../ai/engines/match-engine";

import { ValidationEngine } from "../ai/engines/validation-engine";
import { SafetyEngine } from "../ai/engines/safety-engine";
import { LoggingEngine } from "../ai/engines/logging-engine";

import { errorResponse } from "../utils/error-response";

// ⭐ FIX: 정확한 경로 + 정확한 함수명
import { ownerModeGuard as ownerMiddleware } from "../middleware/owner-mode-guard";

export const SuperAdminController = Router();

// 🔐 OWNER MODE 강제
SuperAdminController.use(ownerMiddleware);

/* ----------------------------------------------------------------------
 * 🔥 1) MathEngine
 * -------------------------------------------------------------------- */
SuperAdminController.post("/superadmin/math/compute", async (req, res) => {
  const route = "superadmin.math.compute";
  const start = Date.now();

  const { expression, apiKey, ip } = req.body;

  if (!ValidationEngine.isString(expression)) {
    return errorResponse(
      res,
      "invalid_expression",
      "expression 파라미터가 누락되었습니다.",
      400
    );
  }

  const safe = SafetyEngine.analyzeUnsafe(expression);
  if (safe.blocked) {
    return errorResponse(res, "blocked", safe.reason ?? "blocked", 400);
  }

  try {
    const result = MathEngine.evalExpr(expression);
    const out = { ok: true, engine: "math", input: expression, result };

    await LoggingEngine.record({
      route,
      method: "POST",
      request: req.body,
      response: out,
      latency: Date.now() - start,
      apiKey,
      ip,
      status: "success",

      // ⭐ superadmin logging
      superadmin: true,
    });

    return res.json(out);
  } catch (err: any) {
    return errorResponse(res, "math_error", String(err), 400);
  }
});

/* ----------------------------------------------------------------------
 * 🔥 2) ChatEngine
 * -------------------------------------------------------------------- */
SuperAdminController.post("/superadmin/chat", async (req, res) => {
  const route = "superadmin.chat";
  const start = Date.now();

  const { message, userType, apiKey, ip } = req.body;
  const persona = {
    role: ValidationEngine.isString(userType) ? userType : "superadmin",
  };

  try {
    const result = await ChatEngine.generateResponse(message, persona);

    await LoggingEngine.record({
      route,
      method: "POST",
      request: req.body,
      response: result,
      latency: Date.now() - start,
      apiKey,
      ip,
      status: "success",

      superadmin: true,
    });

    return res.json(result);
  } catch (err: any) {
    return errorResponse(res, "chat_error", String(err), 500);
  }
});

/* ----------------------------------------------------------------------
 * 🔥 3) RiskEngine
 * -------------------------------------------------------------------- */
SuperAdminController.post("/superadmin/risk", async (req, res) => {
  const route = "superadmin.risk";
  const start = Date.now();

  try {
    const result = await RiskEngine.analyzeRisk(req.body);

    await LoggingEngine.record({
      route,
      method: "POST",
      request: req.body,
      response: result,
      latency: Date.now() - start,
      apiKey: req.body.apiKey,
      ip: req.body.ip,
      status: "success",

      superadmin: true,
    });

    return res.json(result);
  } catch (err: any) {
    return errorResponse(res, "risk_error", String(err), 400);
  }
});

/* ----------------------------------------------------------------------
 * 🔥 4) PatternEngine
 * -------------------------------------------------------------------- */
SuperAdminController.post("/superadmin/pattern", async (req, res) => {
  const route = "superadmin.pattern";
  const start = Date.now();

  try {
    const result = await PatternEngine.analyze(req.body.data, {
      apiKey: req.body.apiKey,
      ip: req.body.ip,
    });

    await LoggingEngine.record({
      route,
      method: "POST",
      request: req.body,
      response: result,
      latency: Date.now() - start,
      status: "success",
      superadmin: true,
    });

    return res.json(result);
  } catch (err: any) {
    return errorResponse(res, "pattern_error", String(err), 400);
  }
});

/* ----------------------------------------------------------------------
 * 🔥 5) MatchEngine (create/find/use)
 * -------------------------------------------------------------------- */
SuperAdminController.post("/superadmin/match/create", async (req, res) => {
  const route = "superadmin.match.create";
  const start = Date.now();

  const result = await MatchEngine.create(req.body);

  await LoggingEngine.record({
    route,
    method: "POST",
    request: req.body,
    response: result,
    latency: Date.now() - start,
    status: "success",
    superadmin: true,
  });

  return res.json(result);
});

SuperAdminController.post("/superadmin/match/find", async (req, res) => {
  const route = "superadmin.match.find";
  const start = Date.now();

  const result = await MatchEngine.find(req.body.code);

  await LoggingEngine.record({
    route,
    method: "POST",
    request: req.body,
    response: result,
    latency: Date.now() - start,
    status: "success",
    superadmin: true,
  });

  return res.json(result);
});

SuperAdminController.post("/superadmin/match/use", async (req, res) => {
  const route = "superadmin.match.use";
  const start = Date.now();

  const result = await MatchEngine.use(req.body);

  await LoggingEngine.record({
    route,
    method: "POST",
    request: req.body,
    response: result,
    latency: Date.now() - start,
    status: "success",
    superadmin: true,
  });

  return res.json(result);
});

export default SuperAdminController;
