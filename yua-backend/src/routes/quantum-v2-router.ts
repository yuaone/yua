// 📂 src/routes/quantum-v2-router.ts
// 🔥 YUA-AI Quantum v2 Router — FINAL BUILD PASS (2025.11)

import { Router, Request, Response } from "express";
import { runQuantumEngineV2 } from "../ai/quantum/quantum-engine-v2";

const quantumV2Router = Router();

/**
 * 🧪 Health Check — Quantum v2
 */
quantumV2Router.get("/health", (_req: Request, res: Response) => {
  return res.json({
    ok: true,
    engine: "quantum-v2",
    status: "ready",
    timestamp: new Date().toISOString(),
  });
});

/**
 * ⚛️ Quantum Engine v2 실행
 */
quantumV2Router.post("/run", async (req: Request, res: Response) => {
  const { input } = req.body ?? {};

  if (typeof input !== "string" || input.trim().length === 0) {
    return res.status(400).json({
      ok: false,
      engine: "quantum-v2",
      error: "input 은 비어있지 않은 문자열이어야 합니다.",
    });
  }

  try {
    const result = await runQuantumEngineV2(input);

    return res.json({
      ok: true,
      engine: "quantum-v2",
      raw: result.raw,
      token: result.token,
      collapseIndex: result.collapseIndex,
      wavePreview: {
        real: result.wave.real.slice(0, 8),
        imag: result.wave.imag.slice(0, 8),
      },
      workingPreview: {
        real: result.working.real.slice(0, 8),
        imag: result.working.imag.slice(0, 8),
      },
      related: result.related ?? [],
    });
  } catch (e: any) {
    console.error("[QUANTUM V2 RUN ERROR]", e);

    return res.status(500).json({
      ok: false,
      engine: "quantum-v2",
      error:
        e?.message ?? "Quantum v2 엔진 실행 중 오류 발생했습니다.",
    });
  }
});

export default quantumV2Router;
