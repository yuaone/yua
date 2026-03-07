// 📂 src/controllers/dev-apikey-controller.ts
// 🔥 Developer API Key Controller — STRICT FINAL (2025.11)
// ✔ LoggingPayload 100% 일치
// ✔ startTime 사용 → logging에는 latency로만 전달
// ✔ 기존 기능/시그니처 그대로 유지
// ✔ 완전 strict 모드 대응

import { Router } from "express";
import crypto from "crypto";
import { db } from "../db/firebase";

import { ValidationEngine } from "../ai/engines/validation-engine";
import { SafetyEngine } from "../ai/engines/safety-engine";
import { LoggingEngine } from "../ai/engines/logging-engine";

export const DevApiKeyController = Router();

/** 🔧 API Key 생성 Helper */
function generateApiKey() {
  const raw = "yua_live_" + crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  return { raw, hash };
}

/**
 * ------------------------------------------------
 * 🔐 1) API Key 생성
 * POST /dev/apikey/create
 * ------------------------------------------------
 */
DevApiKeyController.post("/dev/apikey/create", async (req, res) => {
  const started = Date.now();
  const route = "dev.apikey.create";

  try {
    const { owner } = req.body;

    if (!ValidationEngine.isString(owner)) {
      return error("owner 필드가 누락되었습니다.", req.body);
    }

    const safety = SafetyEngine.analyzeUnsafe(owner);
    if (safety.blocked) {
      return error(`차단됨: ${safety.reason}`, req.body);
    }

    const { raw, hash } = generateApiKey();

    await db.collection("dev_api_keys").doc(owner).set(
      {
        keyHash: hash,
        createdAt: Date.now(),
        lastUsed: null,
      },
      { merge: true }
    );

    const result = { ok: true, owner, apiKey: raw };

    await LoggingEngine.record({
      route,
      method: "POST",
      request: { owner },
      response: result,
      latency: Date.now() - started,
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
      latency: Date.now() - started,
    });

    return res.status(400).json(out);
  }
});

/**
 * ------------------------------------------------
 * 🔍 2) API Key 목록 조회
 * POST /dev/apikey/list
 * ------------------------------------------------
 */
DevApiKeyController.post("/dev/apikey/list", async (req, res) => {
  const started = Date.now();
  const route = "dev.apikey.list";

  try {
    const snap = await db.collection("dev_api_keys").get();

    const result = snap.docs.map((doc) => {
      const data = doc.data();
      return {
        owner: doc.id,
        createdAt: data.createdAt,
        lastUsed: data.lastUsed ?? null,
        preview: data.keyHash.slice(0, 12) + "...",
      };
    });

    await LoggingEngine.record({
      route,
      method: "POST",
      request: {},
      response: result,
      latency: Date.now() - started,
    });

    return res.json({ ok: true, keys: result });
  } catch (e: any) {
    return res.json({ ok: false, error: e?.message || String(e) });
  }
});

/**
 * ------------------------------------------------
 * ❌ 3) API Key 삭제
 * POST /dev/apikey/delete
 * ------------------------------------------------
 */
DevApiKeyController.post("/dev/apikey/delete", async (req, res) => {
  const started = Date.now();
  const route = "dev.apikey.delete";

  try {
    const { owner } = req.body;

    if (!ValidationEngine.isString(owner)) {
      return error("owner 필드가 누락되었습니다.", req.body);
    }

    const ref = db.collection("dev_api_keys").doc(owner);
    const snap = await ref.get();

    if (!snap.exists) {
      return error("해당 owner의 API Key가 존재하지 않습니다.", req.body);
    }

    await ref.delete();

    const result = { ok: true, owner };

    await LoggingEngine.record({
      route,
      method: "POST",
      request: { owner },
      response: result,
      latency: Date.now() - started,
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
      latency: Date.now() - started,
    });

    return res.status(400).json(out);
  }
});

export default DevApiKeyController;
