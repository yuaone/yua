// 📂 src/controllers/dev-ai-test-controller.ts
// 🔥 YUA-AI Developer AI Test Controller — FINAL STRICT SAFE VERSION (2025.11.20)

import { Router } from "express";


import { RiskEngine } from "../ai/engines/risk-engine";
import { ReportEngine } from "../ai/engines/report-engine";
import { MathEngine } from "../ai/engines/math-engine";
import { ChatEngine } from "../ai/engines/chat-engine";
import { SafetyEngine } from "../ai/engines/safety-engine";
import { ValidationEngine } from "../ai/engines/validation-engine";
import { LoggingEngine } from "../ai/engines/logging-engine";

export const DevAiTestController = Router();

/**
 * ---------------------------------------------------------
 * 🧠 1) Chat 엔진 테스트
 * ---------------------------------------------------------
 */
DevAiTestController.post("/dev/ai/chat", async (req, res) => {
  const route = "dev.ai.chat";
  const start = Date.now();

  try {
    const { prompt, apiKey } = req.body;

    if (!ValidationEngine.isString(prompt)) {
      return error("prompt 파라미터 누락", req.body);
    }

    const safe = SafetyEngine.analyzeUnsafe(prompt);
    if (safe.blocked) return error(`차단됨: ${safe.reason}`, req.body);

    // ✅ FIX: generate → generateResponse
    const result = await ChatEngine.generateResponse(
  prompt,
  { role: "tester" },
  {}
);

    await LoggingEngine.record({
      route,
      method: "POST",
      request: { prompt },
      response: result,
      apiKey,
      ip: req.ip,
      latency: Date.now() - start,
    });

    return res.json(result);
  } catch (e: any) {
    return error(e?.message || String(e), req.body);
  }

  function error(message: string, request: any) {
    const out = { ok: false, error: message };

    LoggingEngine.record({
      route,
      method: "POST",
      request,
      response: out,
      error: message,
      apiKey: req.body?.apiKey,
      ip: req.ip,
      latency: Date.now() - start,
    });

    return res.status(400).json(out);
  }
});

/**
 * ---------------------------------------------------------
 * ⚠️ 2) Risk 엔진 테스트
 * ---------------------------------------------------------
 */
DevAiTestController.post("/dev/ai/risk", async (req, res) => {
  const route = "dev.ai.risk";
  const start = Date.now();

  try {
    const { text, apiKey } = req.body;

    if (!ValidationEngine.isString(text)) {
      return error("text 파라미터 누락", req.body);
    }

    const safe = SafetyEngine.analyzeUnsafe(text);
    if (safe.blocked) return error(`차단됨: ${safe.reason}`, req.body);

    const result = await RiskEngine.analyze({
      text,
      apiKey,
      ip: req.ip,
    });

    await LoggingEngine.record({
      route,
      method: "POST",
      request: { text },
      response: result,
      apiKey,
      ip: req.ip,
      latency: Date.now() - start,
    });

    return res.json(result);
  } catch (e: any) {
    return error(e?.message || String(e), req.body);
  }

  function error(message: string, request: any) {
    const out = { ok: false, error: message };

    LoggingEngine.record({
      route,
      method: "POST",
      request,
      response: out,
      error: message,
      apiKey: req.body?.apiKey,
      ip: req.ip,
      latency: Date.now() - start,
    });

    return res.status(400).json(out);
  }
});

/**
 * ---------------------------------------------------------
 * 📑 3) Report 엔진 테스트
 * ---------------------------------------------------------
 */
DevAiTestController.post("/dev/ai/report", async (req, res) => {
  const route = "dev.ai.report";
  const start = Date.now();

  try {
    const { input, apiKey } = req.body;

    if (!ValidationEngine.isObject(input)) {
      return error("input 파라미터 누락", req.body);
    }

    const safe = SafetyEngine.analyzeUnsafe(JSON.stringify(input));
    if (safe.blocked) return error(`차단됨: ${safe.reason}`, req.body);

    const normalized: any = {
      userType: input.userType ?? "tester",
      transactions: input.transactions ?? [],
      ...input,
      apiKey,
      ip: req.ip,
    };

    const result = await ReportEngine.generateReport(normalized);

    await LoggingEngine.record({
      route,
      method: "POST",
      request: { input },
      response: result,
      apiKey,
      ip: req.ip,
      latency: Date.now() - start,
    });

    return res.json(result);
  } catch (e: any) {
    return error(e?.message || String(e), req.body);
  }

  function error(message: string, request: any) {
    const out = { ok: false, error: message };

    LoggingEngine.record({
      route,
      method: "POST",
      request,
      response: out,
      error: message,
      apiKey: req.body?.apiKey,
      ip: req.ip,
      latency: Date.now() - start,
    });

    return res.status(400).json(out);
  }
});

/**
 * ---------------------------------------------------------
 * ➗ 4) Math 엔진 테스트
 * ---------------------------------------------------------
 */
DevAiTestController.post("/dev/ai/math", async (req, res) => {
  const route = "dev.ai.math";
  const start = Date.now();

  try {
    const { expression } = req.body;

    if (!ValidationEngine.isString(expression)) {
      return error("expression 파라미터 누락", req.body);
    }

    const safe = SafetyEngine.analyzeUnsafe(expression);
    if (safe.blocked) return error(`차단됨: ${safe.reason}`, req.body);

    // ✅ MathEngine 계약 준수
    const result = await MathEngine.evaluate({ expression });

    await LoggingEngine.record({
      route,
      method: "POST",
      request: { expression },
      response: result,
      latency: Date.now() - start,
    });

    return res.json(result);
  } catch (e: any) {
    return error(e?.message || String(e), req.body);
  }

  function error(message: string, request: any) {
    const out = { ok: false, error: message };

    LoggingEngine.record({
      route,
      method: "POST",
      request,
      response: out,
      error: message,
      latency: Date.now() - start,
    });

    return res.status(400).json(out);
  }
});

export default DevAiTestController;
