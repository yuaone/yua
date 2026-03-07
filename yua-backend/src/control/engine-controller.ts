import { Request, Response } from "express";
import { yuaSpine } from "../ai/yua/yua-spine";
import { decidePath } from "../routes/path-router";
import { normalizeInput } from "../ai/input/input-normalizer";
import type { RawInput } from "../ai/input/input-types";

let ENGINE_MODE: "dev" | "prod" = "prod";
let ENGINE_MEMORY: any = {};

export const EngineController = {
  // -------------------------------------------------------------
  // 상태 체크
  // -------------------------------------------------------------
  status: async (_req: Request, res: Response) => {
    return res.json({
      ok: true,
      engine: "YUA-AI Core",
      status: "running",
      provider: ENGINE_MODE,
      timestamp: new Date().toISOString(),
    });
  },

  // -------------------------------------------------------------
  // Memory Reset
  // -------------------------------------------------------------
  memoryReset: async (_req: Request, res: Response) => {
    ENGINE_MEMORY = {};
    return res.json({ ok: true, message: "memory cleared" });
  },

  // -------------------------------------------------------------
  // MODE 변경
  // -------------------------------------------------------------
  setMode: async (req: Request, res: Response) => {
    const { mode } = req.body;
    if (!["dev", "prod"].includes(mode)) {
      return res.status(400).json({ ok: false, error: "Invalid mode" });
    }
    ENGINE_MODE = mode;
    return res.json({ ok: true, mode: ENGINE_MODE });
  },

  // -------------------------------------------------------------
  // 단일 run (비 스트리밍)
  // -------------------------------------------------------------
  run: async (req: Request, res: Response) => {
    try {
      const { text } = req.body;
      if (!text) {
        return res.status(400).json({ ok: false, error: "Missing text" });
      }

      const path = decidePath(text);

      const out = await yuaSpine.run({
        text,
        path,
      });
      return res.json({ ok: true, result: out });

    } catch (err: any) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  },

  // -------------------------------------------------------------
  // Spine (비 스트리밍)
  // -------------------------------------------------------------
  spine: async (req: Request, res: Response) => {
    try {
      const { text } = req.body;
      if (!text) {
        return res.status(400).json({ ok: false, error: "Missing text" });
      }

      const path = decidePath(text);

      const out = await yuaSpine.run({
        text,
        path,
      });

      return res.json({ ok: true, spine: out });

    } catch (err: any) {
      return res.status(500).json({ ok: false, error: err.message });
    }
  },

  // =============================================================
  // ⭐⭐⭐ Spine Streaming (SSE) — 여기부터 진짜 스트리밍 ⭐⭐⭐
  // =============================================================
  spineStream: async (req: Request, res: Response) => {
    const { text } = req.query;
    if (!text || typeof text !== "string") {
      res.status(400).json({ ok: false, error: "Missing ?text=" });
      return;
    }

    // SSE 헤더 설정
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();

    const encoder = (data: any) =>
      `data: ${JSON.stringify(data)}\n\n`;

    try {
      // Spine 스트림 생성
      const rawInput: RawInput = {
       content: text,
       source: "API",
      };

const normalized = normalizeInput(rawInput);
const path = decidePath(normalized);

      const stream = yuaSpine.runStream({
        text,
        path,
      });

      for await (const chunk of stream) {
        res.write(encoder(chunk)); // ⭐ 실시간 push
      }

      // 종료 신호
      res.write(encoder({ stage: "complete" }));
      res.end();

    } catch (err: any) {
      res.write(encoder({ error: err.message }));
      res.end();
    }
  }
};
