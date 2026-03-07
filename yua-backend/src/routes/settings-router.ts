// 📂 src/routes/settings-router.ts
// 🔥 YA-ENGINE Settings Router — Admin SDK FIXED

import { Router } from "express";
import { db } from "../db/firebase";

const router = Router();

/* -------------------------------------------------------
 * 🔵 GET /settings
 * ----------------------------------------------------- */
router.get("/", async (_req, res) => {
  try {
    const ref = db.collection("system").doc("settings");
    const snap = await ref.get();

    return res.json(snap.data() || {});
  } catch (e: any) {
    return res.status(500).json({ error: { message: e.message } });
  }
});

/* -------------------------------------------------------
 * 🟣 POST /settings
 * ----------------------------------------------------- */
router.post("/", async (req, res) => {
  try {
    const ref = db.collection("system").doc("settings");
    await ref.set(req.body, { merge: true });

    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ error: { message: e.message } });
  }
});

export default router;
