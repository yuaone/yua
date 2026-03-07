// 📂 src/routes/auth-router.ts
// Firebase Client → idToken 전달받아 검증 후 JWT 발급 + JWT로 사용자 정보 확인

import { Router } from "express";
import jwt from "jsonwebtoken";
import { auth, db } from "../db/firebase";
import { logError } from "../utils/logger";

const router = Router();

/* -------------------------------------------------------
 * 🟢 Login (Firebase idToken → JWT 변환)
 * ----------------------------------------------------- */
router.post("/login", async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({
        ok: false,
        error: "missing_token",
      });
    }

    // Firebase ID Token 검증
    const decoded = await auth.verifyIdToken(idToken);
    const uid = decoded.uid;

    // Firestore에 있는 콘솔 사용자 정보 확인
    const snap = await db.collection("console_users").doc(uid).get();
    const profile = snap.exists ? snap.data() : {};

    // 내부 JWT 발급 (7일)
    const token = jwt.sign(
      {
        uid,
        email: decoded.email,
        role: profile?.role ?? "user",
      },
      process.env.JWT_SECRET!,
      { expiresIn: "7d" }
    );

    return res.json({
      ok: true,
      token,
      user: {
        id: uid,
        email: decoded.email,
        name: profile?.name ?? "",
        role: profile?.role ?? "user",
      },
    });

  } catch (e: any) {
    logError("❌ Auth Error: " + e.message);
    return res.status(401).json({ ok: false, error: "invalid_token" });
  }
});


/* -------------------------------------------------------
 * 🟢 Me (JWT → 사용자 정보 확인)
 * ----------------------------------------------------- */
router.get("/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ ok: false, error: "missing_token" });
    }

    const token = authHeader.split(" ")[1];

    // JWT 복호화하여 사용자 정보 추출
    const decoded: any = jwt.verify(token, process.env.JWT_SECRET!);

    // Firestore에서 최신 프로필 조회
    const snap = await db.collection("console_users").doc(decoded.uid).get();
    const profile = snap.exists ? snap.data() : {};

    return res.json({
      ok: true,
      user: {
        id: decoded.uid,
        email: decoded.email,
        name: profile?.name ?? "",
        role: profile?.role ?? decoded.role ?? "user",
      },
    });

  } catch (e) {
    return res.status(401).json({ ok: false, error: "invalid_token" });
  }
});

export default router;
