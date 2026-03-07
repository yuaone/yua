// 🔥 ResearchController — FINAL 2025.11

import { Request, Response } from "express";
import { ResearchEngine } from "../ai/research/research-engine";

export const researchController = {
  async analyze(req: Request, res: Response) {
    try {
      const { workspaceId, documents, goal, compare } = req.body ?? {};

      if (!workspaceId || typeof workspaceId !== "string") {
        return res.status(400).json({
          ok: false,
          engine: "research-error",
          error: "workspaceId가 필요합니다.",
        });
      }

      if (!Array.isArray(documents) || documents.length === 0) {
        return res.status(400).json({
          ok: false,
          engine: "research-error",
          error: "documents 배열이 필요합니다.",
        });
      }

      const out = await ResearchEngine.analyze({
        workspaceId,
        documents,
        goal,
        compare,
      });

      return res.status(200).json({
        ok: true,
        engine: "research",
        result: out,
      });
    } catch (e: any) {
      return res.status(500).json({
        ok: false,
        engine: "research-error",
        error: String(e),
      });
    }
  },
};
