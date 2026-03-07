// 📂 src/controllers/user-controller.ts
// 🔥 UserController — FIREBASE + MYSQL LOG (2025.11 EXTENDED)
// --------------------------------------------------------------

import { Request, Response } from "express";
import { db } from "../db/firebase";
import { query } from "../db/db-wrapper";   // ⭐ MySQL 추가

export const userController = {
  getProfile: async (req: Request, res: Response): Promise<Response> => {
    const startedAt = Date.now();

    try {
      const userId =
        (req.query?.userId as string) ||
        (req.body?.userId as string) ||
        null;

      if (!userId || typeof userId !== "string") {
        const response = {
          ok: false,
          engine: "user-error",
          error: "userId가 누락되었거나 문자열이 아닙니다.",
        };

        // ⭐ MySQL 로그 저장
        await query(
          "INSERT INTO user_logs (userId, status, error, request_json, response_json, created_at) VALUES (?, ?, ?, ?, ?, ?)",
          [null, "error", "userId 누락", JSON.stringify(req.body), JSON.stringify(response), Date.now()]
        );

        return res.status(400).json(response);
      }

      // Firestore 조회
      const ref = db.collection("users").doc(userId);
      const snap = await ref.get();

      if (!snap.exists) {
        const response = {
          ok: false,
          engine: "user-error",
          error: "해당 userId의 프로필을 찾을 수 없습니다.",
        };

        await query(
          "INSERT INTO user_logs (userId, status, error, request_json, response_json, created_at) VALUES (?, ?, ?, ?, ?, ?)",
          [userId, "error", "user 프로필 없음", JSON.stringify(req.body), JSON.stringify(response), Date.now()]
        );

        return res.status(404).json(response);
      }

      const data = snap.data() || {};

      // 타입 매핑
      const mappedType = (() => {
        const raw = String(data.userType || "").toLowerCase();
        if (["individual", "personal", "employee"].includes(raw)) return "individual";
        if (["biz", "sole", "self", "sole-prop"].includes(raw)) return "biz";
        if (["corp", "corporate"].includes(raw)) return "corp";
        if (["tax", "firm", "accounting"].includes(raw)) return "expert";
        if (raw === "superadmin") return "superadmin";
        return "individual";
      })();

      const user = {
        userId,
        userType: mappedType,
        nickname: data.nickname || data.name || "사용자",
        email: data.email || null,
        createdAt: data.createdAt || null,
        lastLogin: data.lastLogin || null,
      };

      const response = {
        ok: true,
        engine: "user",
        user,
      };

      // ⭐ MySQL 성공 기록
      await query(
        "INSERT INTO user_logs (userId, status, request_json, response_json, created_at) VALUES (?, ?, ?, ?, ?)",
        [
          userId,
          "success",
          JSON.stringify(req.body),
          JSON.stringify(response),
          Date.now(),
        ]
      );

      return res.status(200).json(response);

    } catch (e: any) {
      const response = {
        ok: false,
        engine: "user-error",
        error: String(e),
      };

      await query(
        "INSERT INTO user_logs (userId, status, error, request_json, response_json, created_at) VALUES (?, ?, ?, ?, ?, ?)",
        [
          req.body?.userId ?? null,
          "error",
          String(e),
          JSON.stringify(req.body),
          JSON.stringify(response),
          Date.now(),
        ]
      );

      return res.status(500).json(response);
    }
  },
};
