// 📂 src/ai/lite/hpe-lite.ts
// ✅ Deterministic HPE Lite (no Math.random)
// ✅ Optional agreement + residualPenalty hooks (non-breaking)

import type { AgreementSignal } from "./fsle-lite";

export interface HPEOutput {
  stabilized: string;
  confidence: number;
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

// deterministic hash(0~1): Math.random 대체
function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const u = h >>> 0;
  return (u % 10000) / 10000;
}

function softenAbsolutes(text: string): string {
  return text
    .replace(/100%/g, "높은 가능성")
    .replace(/확실합니다/gi, "높아 보입니다")
    .replace(/절대/gi, "대체로")
    .replace(/무조건/gi, "대부분의 경우")
    .replace(/반드시/gi, "대개");
}

function capConfidence(params: {
  base: number;
  agreement?: AgreementSignal;
  residualPenalty?: number; // 0~1
}): number {
  let c = clamp01(params.base);

  const agreementScore = clamp01(params.agreement?.agreementScore ?? 0.5);
  const divergenceScore = clamp01(params.agreement?.divergenceScore ?? 0.5);

  // - agreement 1.0 → cap 0.95
  // - agreement 0.0 → cap 0.78
  const capFromAgreement = 0.78 + 0.17 * agreementScore;

  // divergence 1.0 → cap 추가 감쇠
  const capFromDivergence = capFromAgreement - 0.08 * divergenceScore;

  // residualPenalty 반영 (과확신 방지)
  const residual = clamp01(params.residualPenalty ?? 0);
  const residualCap = 0.95 - 0.10 * residual;

  const cap = Math.min(capFromDivergence, residualCap);
  c = Math.min(c, cap);

  return Number(clamp01(c).toFixed(4));
}

/**
 * ✅ hpeLite
 * - 기존: hpeLite(text)만 호출해도 동작
 * - 신규: hpeLite(text, agreement, residualPenalty)도 가능
 */
export function hpeLite(
  scenarioText: string,
  agreement?: AgreementSignal,
  residualPenalty?: number
): HPEOutput {
  // deterministic base signals (0~1)
  const r1 = hash01("logical:" + scenarioText);
  const r2 = hash01("regress:" + scenarioText);

  // 기존 범위를 유지하되 랜덤 대신 해시로
  const logicalStability = 0.6 + r1 * 0.1; // 0.6~0.7
  const regressionSignal = 0.3 + r2 * 0.2; // 0.3~0.5

  // ✅ 기존 계산식 유지
  const rawConfidence = logicalStability * 0.6 + regressionSignal * 0.4;

  const stabilized = softenAbsolutes(scenarioText);

  const confidence = capConfidence({
    base: rawConfidence,
    agreement,
    residualPenalty,
  });

  return { stabilized, confidence };
}
