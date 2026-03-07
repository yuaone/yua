// 📂 src/controllers/dev-usage-controller.ts
// 🔥 YUA-AI Developer Usage Controller — STRICT SAFE VERSION (2025.11.20)
// ✔ startTime 제거 → latency 계산 방식으로 통합
// ✔ LoggingPayload 타입 100% 일치
// ✔ 전체 오류 0

import { Router } from "express";
import { db } from "../db/firebase";
import { LoggingEngine } from "../ai/engines/logging-engine";
import { ValidationEngine } from "../ai/engines/validation-engine";

export const DevUsageController = Router();

/** 날짜 포맷 */
function getDateKeys() {
  const now = new Date();

  const day = now.toISOString().slice(0, 10);
  const week = `${now.getFullYear()}-W${Math.ceil((now.getDate() + now.getDay()) / 7)}`;
  const month = now.toISOString().slice(0, 7);

  return { day, week, month };
}

/**
 * Firestore → dev_usage/{apiKeyHash}
 */
export async function increaseUsage(apiKeyHash: string) {
  if (!apiKeyHash) return;

  const ref = db.collection("dev_usage").doc(apiKeyHash);
  const snap = await ref.get();

  const { day, week, month } = getDateKeys();

  const base = snap.exists ? snap.data() : undefined;

  const baseSafe = {
    daily: base?.daily ?? {},
    weekly: base?.weekly ?? {},
    monthly: base?.monthly ?? {},
  };

  const newData = {
    daily: {
      ...baseSafe.daily,
      [day]: (baseSafe.daily[day] || 0) + 1,
    },
    weekly: {
      ...baseSafe.weekly,
      [week]: (baseSafe.weekly[week] || 0) + 1,
    },
    monthly: {
      ...baseSafe.monthly,
      [month]: (baseSafe.monthly[month] || 0) + 1,
    },
    updatedAt: Date.now(),
  };

  await ref.set(newData, { merge: true });
}

/**
 * 📌 1) 전체 API Key 사용량 조회
 */
DevUsageController.post("/dev/usage/all", async (req, res) => {
  const route = "dev.usage.all";
  const start = Date.now();

  try {
    const snap = await db.collection("dev_usage").get();

    const result = snap.docs.map((doc) => {
      const data = doc.data() || {};

      return {
        apiKeyHashPreview: doc.id.slice(0, 12) + "...",
        daily: data.daily ?? {},
        weekly: data.weekly ?? {},
        monthly: data.monthly ?? {},
        updatedAt: data.updatedAt ?? null,
      };
    });

    await LoggingEngine.record({
      route,
      method: "POST",
      request: {},
      response: result,
      latency: Date.now() - start,
    });

    return res.json({ ok: true, usage: result });
  } catch (err: any) {
    return res.json({ ok: false, error: err?.message || String(err) });
  }
});

/**
 * 📌 2) 특정 API Key 사용량 조회
 */
DevUsageController.post("/dev/usage/get", async (req, res) => {
  const route = "dev.usage.get";
  const start = Date.now();

  try {
    const { apiKeyHash } = req.body;

    if (!ValidationEngine.isString(apiKeyHash)) {
      return error("apiKeyHash 필드가 누락되었습니다.");
    }

    const ref = db.collection("dev_usage").doc(apiKeyHash);
    const snap = await ref.get();

    const base = snap.exists ? snap.data() : undefined;

    const safeData = {
      daily: base?.daily ?? {},
      weekly: base?.weekly ?? {},
      monthly: base?.monthly ?? {},
      updatedAt: base?.updatedAt ?? null,
    };

    const result = {
      apiKeyHashPreview: apiKeyHash.slice(0, 12) + "...",
      ...safeData,
    };

    await LoggingEngine.record({
      route,
      method: "POST",
      request: req.body,
      response: result,
      latency: Date.now() - start,
    });

    return res.json({ ok: true, usage: result });
  } catch (err: any) {
    return error(err?.message || String(err));
  }

  function error(message: string) {
    const startErr = Date.now();

    const out = { ok: false, error: message };

    LoggingEngine.record({
      route,
      method: "POST",
      request: req.body,
      response: out,
      error: message,
      latency: Date.now() - startErr,
    });

    return res.status(400).json(out);
  }
});

/**
 * 📌 3) Developer Console Dashboard — 전체 요약
 */
DevUsageController.post("/dev/usage/summary", async (req, res) => {
  const route = "dev.usage.summary";
  const start = Date.now();

  try {
    const snap = await db.collection("dev_usage").get();

    let todayTotal = 0;
    let weekTotal = 0;
    let monthTotal = 0;

    const { day, week, month } = getDateKeys();

    snap.docs.forEach((doc) => {
      const data = doc.data();

      todayTotal += data?.daily?.[day] ?? 0;
      weekTotal += data?.weekly?.[week] ?? 0;
      monthTotal += data?.monthly?.[month] ?? 0;
    });

    const result = {
      today: todayTotal,
      week: weekTotal,
      month: monthTotal,
      keysRegistered: snap.size,
    };

    await LoggingEngine.record({
      route,
      method: "POST",
      request: {},
      response: result,
      latency: Date.now() - start,
    });

    return res.json({ ok: true, summary: result });
  } catch (err: any) {
    return res.json({ ok: false, error: err?.message || String(err) });
  }
});
