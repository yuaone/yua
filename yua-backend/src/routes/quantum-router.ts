// 📂 src/routes/quantum-router.ts
// 🔥 YUA-AI Quantum Router — FINAL BUILD-PASS (2025.12)

import { Router, Request, Response } from "express";
import { runQuantumEngine } from "../ai/quantum/quantum-engine";
import type { QuantumResult } from "../ai/quantum/qtypes";

const quantumRouter = Router();

/* ------------------------------------------------------
   🧪 Health Check
------------------------------------------------------ */
quantumRouter.get("/health", (_req: Request, res: Response) => {
  return res.json({
    ok: true,
    engine: "quantum",
    status: "ready",
    timestamp: new Date().toISOString(),
  });
});

/* ------------------------------------------------------
   ⚛️ Quantum Engine 실행
------------------------------------------------------ */
quantumRouter.post("/run", async (req: Request, res: Response) => {
  const { input } = req.body ?? {};

  if (typeof input !== "string" || input.trim().length === 0) {
    return res.status(400).json({
      ok: false,
      engine: "quantum",
      error: "input 은 비어있지 않은 문자열이어야 합니다.",
    });
  }

  try {
    // ⭐ 명확한 타입 단언으로 TS Promise 오류 제거
    const result: QuantumResult = await runQuantumEngine(input);

    return res.json({
      ok: true,
      engine: "quantum",

      input: result.raw,
      collapsed: result.collapsed,

      // ⭐ 안전한 state preview
      statePreview:
        Array.isArray(result.state?.vector)
          ? result.state.vector.slice(0, 8)
          : [],

      noise: result.state?.noise ?? 0,
      confidence: result.state?.confidence ?? 1,

      drift: result.drift ?? 0,
      related: result.related ?? [],
    });
  } catch (e: any) {
    console.error("[QUANTUM RUN ERROR]", e);

    return res.status(500).json({
      ok: false,
      engine: "quantum",
      error: e?.message ?? "Quantum Engine 실행 중 오류 발생",
    });
  }
});

export default quantumRouter;
