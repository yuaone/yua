// 📂 src/ai/lite/pipeline-lite.ts
// 🔥 YUA-Lite Pipeline — FINAL BUILD + VKR HOOK (2025.12)
// ✅ Updated: FSLE Agreement + Residual Penalty (Deterministic stabilization)

import type { LitePipelineOutput } from "./types";

import { aossLite } from "./aoss-lite";
import { fsleLite, selectTopScenario, analyzeAgreement, estimateResidualPenalty } from "./fsle-lite";
import { hpeLite } from "./hpe-lite";
import { sanitizeLite } from "./sanitizer-lite";

import { computeRiskBalance } from "./stability/risk-balance";
import { suppressOverconfidence } from "./stability/overconfidence";
import { regressionCorrection } from "./stability/regression";

// 🔥 VKR
import { runVKR } from "../vkr/vkr-engine";

export async function runLitePipeline(userInput: string): Promise<LitePipelineOutput> {
  /* ------------------------------------------------
     0) AOSS Lite
  ------------------------------------------------ */
  const aoss = aossLite(userInput);

  if (!aoss.safe) {
    return {
      ok: false,
      cleaned: aoss.cleaned ?? "",
      internalSignal: "",
      blocked: true,
      reply: "",
      reason: "AOSS blocked",
      metadata: {
        aoss,
        fsle: { agent: "", text: "", valueScore: 0, riskScore: 1, finalScore: 0 },
        hpe: { stabilized: "", confidence: 0, output: "" },
        stableConfidence: 0,
        riskFactor: 1,
      },
    };
  }

  /* ------------------------------------------------
     1) FSLE Lite
  ------------------------------------------------ */
  const scenarios = fsleLite(aoss.cleaned);

  const riskFactor = computeRiskBalance({
    fpCost: 0.3,
    fnCost: 0.7,
    tau: 0.7,
  });

  // 기존 구조 유지: riskFactor 반영
  const adjusted = scenarios.map((s) => ({
    ...s,
    finalScore: s.valueScore - riskFactor * s.riskScore,
  }));

  // ✅ NEW: agreement + residualPenalty
  const agreement = analyzeAgreement(adjusted);
  const residualPenalty = estimateResidualPenalty({
    input: aoss.cleaned,
    agreement,
    epsilon: 0.05,
  });

  const adjustedStabilized = adjusted.map((s) => ({
    ...s,
    finalScore: Number((s.finalScore - residualPenalty).toFixed(6)),
  }));

  const top = selectTopScenario(adjustedStabilized);

  /* ------------------------------------------------
     2) HPE Lite + Regression Correction
  ------------------------------------------------ */
  const hpe = hpeLite(top.text, agreement, residualPenalty);

  const corrected = regressionCorrection({
    input: top.text,
    base: hpe.stabilized,
    epsilon: 0.03,
    residualPenalty,
  });

  const stableConfidence = suppressOverconfidence(hpe.confidence, 0.95, 8);
  const sanitized = sanitizeLite(corrected, stableConfidence);

  /* ------------------------------------------------
     2-1) VKR Trigger (조건부)
  ------------------------------------------------ */
  let vkrHints: any[] = [];

  const needVKR = stableConfidence < 0.55 || top.riskScore > 0.6;

  if (needVKR) {
    try {
      const vkr = await runVKR({
        query: sanitized,
        context: "lite-pipeline",
        maxDocs: 2,
        triggeredBy: "lite",
      });

      if (vkr.ok) vkrHints = vkr.hints;
    } catch {
      vkrHints = [];
    }
  }

  /* ------------------------------------------------
     3) Final Unified Output
  ------------------------------------------------ */
  return {
    ok: true,
    cleaned: sanitized,
    internalSignal: sanitized,
    blocked: false,
    reply: "",
    metadata: {
      aoss,
      fsle: top,
      // ⚠️ LitePipelineOutput 타입이 output 필드를 요구하는 기존 설계면 유지
      hpe: { ...hpe, output: hpe.stabilized },
      stableConfidence,
      riskFactor,
      vkrHints,
      // (선택) 디버그 추적용으로 남기고 싶으면 types에 정의 필요
      // agreement,
      // residualPenalty,
    },
  };
}
