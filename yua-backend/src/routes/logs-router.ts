// 📂 src/routes/logs-router.ts
// 🔥 YUA-AI Engine — Logs Router (2025.11 FINAL)
// -------------------------------------------------------
// ✔ Firestore Admin SDK 기반
// ✔ 최근 로그 / 전체 로그 / 요약
// ✔ workflow & auth & ai 이벤트 모두 기록 가능
// -------------------------------------------------------

import { Router } from "express";
import { db } from "../db/firebase";

const router = Router();

const COLLECTION = "console_logs";

/* -------------------------------------------------------
 * 🟢 1) 전체 로그 조회 (최대 200개)
 * GET /logs
 * ----------------------------------------------------- */
router.get("/", async (_req, res) => {
  try {
    const snap = await db
      .collection(COLLECTION)
      .orderBy("timestamp", "desc")
      .limit(200)
      .get();

    const list = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    return res.json({ ok: true, logs: list });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

/* -------------------------------------------------------
 * 🔵 2) 최근 로그 20개
 * GET /logs/recent
 * ----------------------------------------------------- */
router.get("/recent", async (_req, res) => {
  try {
    const snap = await db
      .collection(COLLECTION)
      .orderBy("timestamp", "desc")
      .limit(20)
      .get();

    const list = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    }));

    return res.json({ ok: true, logs: list });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

/* -------------------------------------------------------
 * 🟣 3) 로그 요약 (24시간 카운트)
 * GET /logs/summary
 * ----------------------------------------------------- */
router.get("/summary", async (_req, res) => {
  try {
    const since = Date.now() - 24 * 60 * 60 * 1000;

    const snap = await db
      .collection(COLLECTION)
      .where("timestamp", ">=", since)
      .get();

    const list = snap.docs.map((d) => d.data());

    const summary = {
      total: list.length,
      login: list.filter((l: any) => l.type === "login").length,
      workflow: list.filter((l: any) => l.type === "workflow").length,
      ai: list.filter((l: any) => l.type === "ai").length,
      risk: list.filter((l: any) => l.type === "risk").length,
    };

    return res.json({ ok: true, summary });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

/* -------------------------------------------------------
 * 🟡 4) 로그 생성 (서버 내부에서 사용)
 * POST /logs
 * ----------------------------------------------------- */
router.post("/", async (req, res) => {
  try {
    const body = req.body || {};

    await db.collection(COLLECTION).add({
      ...body,
      timestamp: Date.now(),
    });

    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

export default router;
