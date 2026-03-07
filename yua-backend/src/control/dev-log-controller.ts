// 📂 src/controllers/dev-log-controller.ts
// 🔥 YUA-AI Developer Log Controller — STRICT FINAL (2025.11)
// ✔ LoggingPayload 100% 일치
// ✔ startTime 제거 → latency 계산 방식 통합
// ✔ 기존 기능/흐름 완전 유지

import { Router } from "express";
import { db } from "../db/firebase";
import { ValidationEngine } from "../ai/engines/validation-engine";
import { LoggingEngine } from "../ai/engines/logging-engine";

export const DevLogController = Router();

/** 🔍 안전 숫자 변환 */
function toNumber(value: any, fallback: number): number {
  const n = Number(value);
  return isNaN(n) ? fallback : n;
}

/**
 * -------------------------------------------------------
 * 📌 1) 전체 로그 조회
 * POST /dev/logs/all
 * -------------------------------------------------------
 */
DevLogController.post("/dev/logs/all", async (req, res) => {
  const route = "dev.logs.all";
  const started = Date.now();

  try {
    const {
      limit = 50,
      startAfter,
      route: filterRoute,
      apiKey,
      userType,
      from,
      to,
    } = req.body;

    let query: FirebaseFirestore.Query = db
      .collection("api_logs")
      .orderBy("timestamp", "desc");

    if (ValidationEngine.isString(filterRoute)) {
      query = query.where("route", "==", filterRoute);
    }

    if (ValidationEngine.isString(apiKey)) {
      query = query.where("apiKey", "==", apiKey);
    }

    if (ValidationEngine.isString(userType)) {
      query = query.where("userType", "==", userType);
    }

    if (from && to) {
      query = query
        .where("timestamp", ">=", toNumber(from, 0))
        .where("timestamp", "<=", toNumber(to, Date.now()));
    }

    if (ValidationEngine.isString(startAfter)) {
      const doc = await db.collection("api_logs").doc(startAfter).get();
      if (doc.exists) query = query.startAfter(doc);
    }

    const snap = await query.limit(Number(limit)).get();

    const result = snap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    await LoggingEngine.record({
      route,
      method: "POST",
      request: req.body,
      response: { count: result.length },
      latency: Date.now() - started,
    });

    return res.json({ ok: true, logs: result });
  } catch (err: any) {
    return res.json({ ok: false, error: String(err) });
  }
});

/**
 * -------------------------------------------------------
 * 📌 2) 단일 로그 조회
 * POST /dev/logs/get
 * -------------------------------------------------------
 */
DevLogController.post("/dev/logs/get", async (req, res) => {
  const route = "dev.logs.get";
  const started = Date.now();

  try {
    const { logId } = req.body;

    if (!ValidationEngine.isString(logId)) {
      return res.status(400).json({ ok: false, error: "logId 누락" });
    }

    const snap = await db.collection("api_logs").doc(logId).get();

    if (!snap.exists) {
      return res.json({ ok: false, error: "로그를 찾을 수 없습니다." });
    }

    const result = { id: snap.id, ...snap.data() };

    await LoggingEngine.record({
      route,
      method: "POST",
      request: { logId },
      response: result,
      latency: Date.now() - started,
    });

    return res.json({ ok: true, log: result });
  } catch (err: any) {
    return res.json({ ok: false, error: String(err) });
  }
});

/**
 * -------------------------------------------------------
 * 📌 3) route별 로그 통계
 * POST /dev/logs/stats
 * -------------------------------------------------------
 */
DevLogController.post("/dev/logs/stats", async (req, res) => {
  const route = "dev.logs.stats";
  const started = Date.now();

  try {
    const snap = await db.collection("api_logs").get();
    const stats: Record<string, number> = {};

    snap.docs.forEach((doc) => {
      const r = doc.data()?.route || "unknown";
      stats[r] = (stats[r] || 0) + 1;
    });

    await LoggingEngine.record({
      route,
      method: "POST",
      request: {},
      response: stats,
      latency: Date.now() - started,
    });

    return res.json({ ok: true, stats });
  } catch (err: any) {
    return res.json({ ok: false, error: String(err) });
  }
});

export default DevLogController;
