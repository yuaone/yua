// 📂 src/controllers/dev-auth-controller.ts
// 🔥 Developer Console — Auth Controller STRICT FINAL (2025.11.20)
// ✔ startTime 제거 → latency 계산으로 통합
// ✔ LoggingPayload 규격 100% 일치
// ✔ 기존 로그인/토큰/캐시 로직 유지
// ✔ Firestore 기반 Developer Auth

import { Router } from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";

import { db } from "../db/firebase";
import { SafetyEngine } from "../ai/engines/safety-engine";
import { ValidationEngine } from "../ai/engines/validation-engine";
import { LoggingEngine } from "../ai/engines/logging-engine";
import { CachingEngine } from "../ai/engines/caching-engine";

export const DevAuthController = Router();

/** SHA-256 비밀번호 해시 */
function hashPassword(pw: string) {
  return crypto.createHash("sha256").update(pw).digest("hex");
}

/**
 * ---------------------------------------------------------
 *  🔐 1) Developer 로그인
 *  POST /dev/auth/login
 * ---------------------------------------------------------
 */
DevAuthController.post("/dev/auth/login", async (req, res) => {
  const route = "dev.auth.login";
  const start = Date.now();

  try {
    const { email, password } = req.body;

    if (!ValidationEngine.isEmail(email)) {
      return error("잘못된 이메일 형식입니다.");
    }
    if (!ValidationEngine.isString(password)) {
      return error("password 파라미터가 누락되었습니다.");
    }

    const safety = SafetyEngine.analyzeUnsafe(`${email} ${password}`);
    if (safety.blocked) {
      return error(`차단: ${safety.reason}`);
    }

    // 캐시 체크
    const cacheKey = CachingEngine.buildKeyFromPayload({
      email,
      type: "dev-login",
    });

    const cached = CachingEngine.get(cacheKey, { namespace: "dev-auth" });
    if (cached) {
      await LoggingEngine.record({
        route,
        method: "POST",
        request: { email },
        response: cached,
        latency: Date.now() - start,
      });
      return res.json(cached);
    }

    const ref = db.collection("developer_accounts").doc(email);
    const snap = await ref.get();

    if (!snap.exists) return error("등록된 개발자 계정이 아닙니다.");

    const data = snap.data() as {
      passwordHash: string;
      role: string;
      createdAt: number;
    };

    const hashed = hashPassword(password);
    if (hashed !== data.passwordHash) {
      return error("비밀번호가 올바르지 않습니다.");
    }

    const token = jwt.sign(
      { email, role: data.role || "developer" },
      process.env.JWT_SECRET || "yua-secret",
      { expiresIn: "2h" }
    );

    const result = {
      ok: true,
      token,
      email,
      role: data.role || "developer",
    };

    CachingEngine.set(cacheKey, result, { namespace: "dev-auth" });

    await LoggingEngine.record({
      route,
      method: "POST",
      request: { email },
      response: result,
      latency: Date.now() - start,
    });

    return res.json(result);
  } catch (err: any) {
    return error(err?.message || String(err));
  }

  /** 에러 wrapper */
  function error(message: string) {
    const out = { ok: false, error: message };

    LoggingEngine.record({
      route,
      method: "POST",
      request: req.body,
      response: out,
      error: message,
      latency: Date.now() - start,
    });

    return res.status(400).json(out);
  }
});

/**
 * ---------------------------------------------------------
 *  🔍 2) Token 검증
 *  POST /dev/auth/verify
 * ---------------------------------------------------------
 */
DevAuthController.post("/dev/auth/verify", async (req, res) => {
  const route = "dev.auth.verify";
  const start = Date.now();

  try {
    const { token } = req.body;

    if (!ValidationEngine.isString(token)) {
      return res.json({ ok: false, error: "token이 누락되었습니다." });
    }

    const safety = SafetyEngine.analyzeUnsafe(token);
    if (safety.blocked) {
      return res.json({ ok: false, error: `차단: ${safety.reason}` });
    }

    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "yua-secret"
      );

      const result = { ok: true, decoded };

      await LoggingEngine.record({
        route,
        method: "POST",
        request: { token },
        response: result,
        latency: Date.now() - start,
      });

      return res.json(result);
    } catch (e) {
      return res.json({ ok: false, error: "토큰이 유효하지 않습니다." });
    }
  } catch (err: any) {
    return res.json({ ok: false, error: err?.message || String(err) });
  }
});
