// 📂 src/controllers/dev-match-controller.ts
// 🔥 Developer Console — MatchEngine Test Controller FINAL STRICT (2025.11.22)

import { Router } from "express";
import { MatchEngine } from "../ai/engines/match-engine";
import { ValidationEngine } from "../ai/engines/validation-engine";
import { SafetyEngine } from "../ai/engines/safety-engine";
import { LoggingEngine } from "../ai/engines/logging-engine";

export const MatchEngineController = Router();

/**
 * -------------------------------------------------------
 *  1) 매칭 코드 생성
 *  POST /dev/match/create
 * -------------------------------------------------------
 */
MatchEngineController.post("/dev/match/create", async (req, res) => {
  const route = "dev.match.create";
  const start = Date.now();

  try {
    const { userId, apiKey, ip } = req.body;

    if (!ValidationEngine.isString(userId)) {
      return error("userId 파라미터가 누락되었습니다.");
    }

    const safe = SafetyEngine.analyzeUnsafe(userId);
    if (safe.blocked) return error(`차단된 요청: ${safe.reason}`);

    const result = await MatchEngine.create({ userId, apiKey, ip });

    await LoggingEngine.record({
      route,
      method: "POST",
      request: req.body,
      response: result,
      apiKey,
      ip,
      latency: Date.now() - start,
    });

    return res.json(result);
  } catch (err: any) {
    return error(err?.message || String(err));
  }

  function error(message: string) {
    const out = { ok: false, engine: "dev-match-error", error: message };

    LoggingEngine.record({
      route,
      method: "POST",
      request: req.body,
      response: out,
      error: message,
      apiKey: req.body?.apiKey,
      ip: req.body?.ip,
      latency: Date.now() - start,
    });

    return res.status(400).json(out);
  }
});

/**
 * -------------------------------------------------------
 *  2) 매칭 코드 조회
 *  POST /dev/match/find
 * -------------------------------------------------------
 */
MatchEngineController.post("/dev/match/find", async (req, res) => {
  const route = "dev.match.find";
  const start = Date.now();

  try {
    const { code, apiKey, ip } = req.body;

    if (!ValidationEngine.isString(code)) {
      return error("code 파라미터가 누락되었습니다.");
    }

    const safe = SafetyEngine.analyzeUnsafe(code);
    if (safe.blocked) return error(`차단된 요청: ${safe.reason}`);

    // ⭐ FIXED — MatchEngine.find() 는 인자 1개만 받음
    const result = await MatchEngine.find(code);

    await LoggingEngine.record({
      route,
      method: "POST",
      request: req.body,
      response: result,
      apiKey,
      ip,
      latency: Date.now() - start,
    });

    return res.json(result);
  } catch (err: any) {
    return error(err?.message || String(err));
  }

  function error(message: string) {
    const out = { ok: false, engine: "dev-match-error", error: message };

    LoggingEngine.record({
      route,
      method: "POST",
      request: req.body,
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
 * -------------------------------------------------------
 *  3) 매칭 코드 사용 처리
 *  POST /dev/match/use
 * -------------------------------------------------------
 */
MatchEngineController.post("/dev/match/use", async (req, res) => {
  const route = "dev.match.use";
  const start = Date.now();

  try {
    const { codeId, apiKey, ip } = req.body;

    if (!ValidationEngine.isString(codeId)) {
      return error("codeId 파라미터가 누락되었습니다.");
    }

    const safe = SafetyEngine.analyzeUnsafe(codeId);
    if (safe.blocked) return error(`차단된 요청: ${safe.reason}`);

    const result = await MatchEngine.use({ codeId, apiKey, ip });

    await LoggingEngine.record({
      route,
      method: "POST",
      request: req.body,
      response: result,
      apiKey,
      ip,
      latency: Date.now() - start,
    });

    return res.json(result);
  } catch (err: any) {
    return error(err?.message || String(err));
  }

  function error(message: string) {
    const out = { ok: false, engine: "dev-match-error", error: message };

    LoggingEngine.record({
      route,
      method: "POST",
      request: req.body,
      response: out,
      error: message,
      apiKey: req.body?.apiKey,
      ip: req.ip,
      latency: Date.now() - start,
    });

    return res.status(400).json(out);
  }
});

export default MatchEngineController;
