// 📂 src/controllers/advisor-controller.ts
// 🔥 YUA-AI — Advisor Controller (2025.11 FULL-FIX VERSION)
// ✔ 기존 구조 유지
// ✔ 프론트(ChatPanel) 호환 100%
// ✔ undefined 절대 발생하지 않는 안정 버전

import { Request, Response } from "express";
import { AdvisorEngine } from "../ai/advisor/advisor-engine";
import { log, logError } from "../utils/logger";

interface AdvisorRequestBody {
  message: string;
  projectId?: string;
  mode?: "default" | "developer" | "tax" | "risk" | "architecture";
}

export const AdvisorController = {
  async analyze(req: Request, res: Response) {
    try {
      const body = req.body as AdvisorRequestBody;

      if (!body.message || typeof body.message !== "string") {
        return res.status(400).json({
          ok: false,
          error: "message must be a string",
        });
      }

      const { message, projectId, mode } = body;

      log(
        `🧠 [AdvisorController] 요청 수신 — mode=${mode ?? "default"}, project=${projectId ?? "none"}`
      );

      const raw = await AdvisorEngine.advise({
        userMessage: message,
        projectId,
        mode,
      });

      // -------------------------------------------------------------
      // ⭐ 핵심: undefined 또는 객체 → 절대 프론트로 보내지 않음
      // -------------------------------------------------------------
      const result =
        typeof raw === "string"
          ? raw
          : JSON.stringify(raw ?? "", null, 2);

      // -------------------------------------------------------------
      // ⭐ 프론트 ChatPanel이 읽는 필드는 `result`
      // -------------------------------------------------------------
      return res.json({
        ok: true,
        result,   // ← ChatPanel에서 사용
        raw,      // ← 디버깅용 옵션
        engine: "advisor",
      });

    } catch (err: any) {
      logError("❌ AdvisorController Error: " + err.message);

      return res.status(500).json({
        ok: false,
        error: err.message || "advisor analysis failed",
      });
    }
  },
};
