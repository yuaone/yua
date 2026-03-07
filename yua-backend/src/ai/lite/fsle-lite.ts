// 📂 src/ai/lite/fsle-lite.ts
// ✅ FSLE Lite (Deterministic scoring)
// - 기존 계산식 유지: valueScore = sigmoid(featureScore)
// - 기존 계산식 유지: riskScore  = sigmoid(risk)
// - 기존 계산식 유지: finalScore = valueScore - 0.7 * riskScore
// - ✅ NEW: analyzeAgreement / estimateResidualPenalty (pipeline에서 사용)

export interface Scenario {
  agent: string;
  text: string;
  valueScore: number;
  riskScore: number;
  finalScore: number;
}

export type AgreementSignal = {
  agreementScore: number; // 0~1 (높을수록 합의)
  divergenceScore: number; // 0~1 (높을수록 불일치)
  stable: boolean;
  topGap: number;
  finalVar: number;
};

function sigmoid(x: number) {
  return 1 / (1 + Math.exp(-x));
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function mean(xs: number[]) {
  if (xs.length === 0) return 0;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function variance(xs: number[]) {
  if (xs.length <= 1) return 0;
  const m = mean(xs);
  return mean(xs.map((x) => (x - m) * (x - m)));
}

function topGap(scores: number[]) {
  if (scores.length < 2) return 0;
  const sorted = [...scores].sort((a, b) => b - a);
  return sorted[0] - sorted[1];
}

function logicalAgent(input: string) {
  return `${input} → 논리적으로 정리하면 핵심은 다음과 같습니다.`;
}
function contextAgent(input: string) {
  return `${input} → 전체 맥락을 고려하면 이렇게 해석할 수 있습니다.`;
}
function knowledgeAgent(input: string) {
  return `${input} → 알려진 정보와 지식을 기반으로 보면 다음이 중요합니다.`;
}

export function fsleLite(input: string): Scenario[] {
  const text = input.toLowerCase();

  const candidates: Scenario[] = [
    { agent: "logical", text: logicalAgent(input), valueScore: 0, riskScore: 0, finalScore: 0 },
    { agent: "context", text: contextAgent(input), valueScore: 0, riskScore: 0, finalScore: 0 },
    { agent: "knowledge", text: knowledgeAgent(input), valueScore: 0, riskScore: 0, finalScore: 0 },
  ];

  for (const c of candidates) {
    // -----------------------------
    // 1) VALUE SCORE
    // -----------------------------
    let featureScore = 0;

    if (/따라서|그러므로|결론적으로|즉/g.test(c.text)) featureScore += 0.4;
    if (c.text.length > 30 && c.text.length < 200) featureScore += 0.3;
    if (/가능|추정|해석/g.test(c.text)) featureScore += 0.2;
    featureScore += Math.min(c.text.length / 300, 0.2);

    c.valueScore = sigmoid(featureScore);

    // -----------------------------
    // 2) RISK SCORE
    // -----------------------------
    let risk = 0;

    if (/100%|절대|무조건/g.test(text)) risk += 0.6;
    if (/확신|단언/g.test(text)) risk += 0.4;
    if (/추측|아마|~일 것/g.test(text)) risk += 0.3;
    if (c.text.length < 10) risk += 0.2;

    c.riskScore = sigmoid(risk);

    // -----------------------------
    // 3) FINAL SCORE (λ=0.7) ✅ 유지
    // -----------------------------
    c.finalScore = c.valueScore - 0.7 * c.riskScore;
  }

  return candidates;
}

export function selectTopScenario(list: Scenario[]): Scenario {
  return list.sort((a, b) => b.finalScore - a.finalScore)[0];
}

/**
 * ✅ Agreement 분석
 * - adjusted(finalScore 포함) 후보를 넣으면 그 기준으로 합의/불일치 계산 가능
 */
export function analyzeAgreement(candidates: Scenario[]): AgreementSignal {
  const finals = candidates.map((c) => c.finalScore);
  const risks = candidates.map((c) => c.riskScore);

  const fVar = variance(finals);
  const rVar = variance(risks);
  const gap = topGap(finals);

  // divergence(0~1): 분산 + gap 약함 결합
  const varComponent = clamp01(fVar * 2.2 + rVar * 1.1);
  const gapComponent = clamp01(0.45 - gap);
  const divergenceScore = clamp01(0.65 * varComponent + 0.35 * gapComponent);
  const agreementScore = clamp01(1 - divergenceScore);

  const stable = agreementScore >= 0.6 && gap >= 0.12;

  return {
    agreementScore: Number(agreementScore.toFixed(4)),
    divergenceScore: Number(divergenceScore.toFixed(4)),
    stable,
    topGap: Number(gap.toFixed(4)),
    finalVar: Number(fVar.toFixed(4)),
  };
}

/**
 * ✅ residualPenalty (0~1)
 * - 후보 불일치가 높을수록 잔차 위험↑
 * - pipeline에서 finalScore 소폭 감점 + HPE/회귀 억제에 같이 사용
 */
export function estimateResidualPenalty(params: {
  input: string;
  agreement: AgreementSignal;
  epsilon?: number;
}): number {
  const { input, agreement, epsilon = 0.05 } = params;

  const len = input.trim().length;
  const lenDamp = len <= 20 ? 0.55 : len <= 60 ? 0.8 : 1.0;

  const gapWeak = clamp01(0.35 - agreement.topGap);
  const varMass = clamp01(agreement.finalVar * 1.8);

  const raw =
    0.60 * agreement.divergenceScore +
    0.25 * gapWeak +
    0.15 * varMass;

  const pen = clamp01(epsilon + raw) * lenDamp;
  return Number(Math.min(pen, 0.92).toFixed(4));
}
