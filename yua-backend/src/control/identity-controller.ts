// 📂 src/controllers/identity-controller.ts
// 🔥 IdentityController — FINAL

import { Request, Response } from "express";
import { IdentityEngine } from "../ai/identity/identity-engine";

export const identityController = {
  // JWT 발급
  issueJWT: async (req: Request, res: Response) => {
    const { userId, role } = req.body ?? {};

    if (!userId || !role) {
      return res.status(400).json({
        ok: false,
        error: "userId / role 필드 필요",
      });
    }

    const token = IdentityEngine.issueJWT({ userId, role });

    return res.status(200).json({
      ok: true,
      token,
    });
  },

  // API Key 생성
  createApiKey: async (req: Request, res: Response) => {
    const { userId, role } = req.body ?? {};

    if (!userId) {
      return res.status(400).json({
        ok: false,
        error: "userId 누락",
      });
    }

    const apiKey = IdentityEngine.generateApiKey(userId);
    await IdentityEngine.saveApiKey(userId, apiKey, role ?? "developer");

    return res.status(200).json({
      ok: true,
      apiKey,
    });
  },
};
