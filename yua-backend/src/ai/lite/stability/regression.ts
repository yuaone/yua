// 📂 src/ai/lite/stability/regression.ts
// ✅ Deterministic Regression Correction (Full Lite)
// - residualPenalty를 "예측" 가능 (NO LLM, deterministic)
// - residualPenalty가 들어오면 그걸 우선 사용
// - 없으면 input/base 기반으로 predictResidualPenalty()로 계산

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function norm(text: string): string {
  return (text ?? "").trim();
}

// 0~1: 길이가 길수록 불확실(잔차) 가능성 ↑ (너무 짧아도 ↑)
function lengthUncertaintyScore(s: string): number {
  const n = s.length;
  if (n <= 12) return 0.65;
  if (n <= 30) return 0.35;
  if (n <= 120) return 0.20;
  if (n <= 300) return 0.30;
  if (n <= 800) return 0.45;
  return 0.55;
}

// 단언/확신 표현 밀도 (0~1)
function absolutismScore(s: string): number {
  const t = s.toLowerCase();
  const patterns = [
    /100%/g,
    /절대/g,
    /무조건/g,
    /반드시/g,
    /확실/g,
    /단언/g,
    /명백/g,
    /완벽/g,
    /확정/g,
    /팩트/g,
  ];
  let hits = 0;
  for (const p of patterns) {
    const m = t.match(p);
    if (m) hits += m.length;
  }
  const denom = Math.max(1, Math.floor(s.length / 50));
  return clamp01(hits / (2.5 * denom));
}

// 근거/제약 밀도: 근거가 많을수록 잔차 ↓ (여기선 "근거 부족" 점수)
function evidenceLackScore(s: string): number {
  const t = s.toLowerCase();
  const evidenceMarkers = [
    /예를 들어/g,
    /근거/g,
    /로그/g,
    /재현/g,
    /조건/g,
    /경우/g,
    /if\b/g,
    /when\b/g,
    /because\b/g,
    /따라서/g,
    /그러므로/g,
    /결론적으로/g,
    /\d+/g,
  ];

  let hits = 0;
  for (const p of evidenceMarkers) {
    const m = t.match(p);
    if (m) hits += m.length;
  }

  return clamp01(1 - hits / 6);
}

// 질문형/요청형이면 단언 위험 ↑
function interrogativeScore(s: string): number {
  const t = s.trim();
  if (!t) return 0;
  const isQ =
    t.endsWith("?") ||
    /(왜|어떻게|뭐|무엇|어떤|가능|방법)/.test(t) ||
    /(why|how|what|which|can)/i.test(t);
  const isRequest = /(해줘|알려줘|정리해줘|만들어줘|설명해줘|적용해줘)$/i.test(t);
  return isQ || isRequest ? 0.35 : 0;
}

// input과 base 톤 괴리
function toneMismatchScore(input: string, base: string): number {
  const i = norm(input);
  const b = norm(base);

  const inputQ = i.endsWith("?") || /(왜|어떻게|뭐|무엇|어떤|가능|방법)/.test(i);
  const baseAbsolute = /(확실|반드시|무조건|절대|100%)/i.test(b);
  const baseSoft = /(가능|추정|~일 수|대체로|높아 보입니다)/i.test(b);

  if (inputQ && baseAbsolute) return 0.55;
  if (!inputQ && !baseSoft && /(아마|가능)/i.test(i)) return 0.25;
  return 0.0;
}

/**
 * ✅ predictResidualPenalty (0~1)
 * - 완전 deterministic
 * - weights 튜닝은 로그 보고 너가 조절하면 됨
 */
export function predictResidualPenalty(params: {
  input: string;
  base: string;
}): number {
  const input = norm(params.input);
  const base = norm(params.base);

  const lenU = lengthUncertaintyScore(base);
  const abs = absolutismScore(base);
  const lack = evidenceLackScore(base);
  const inter = interrogativeScore(input);
  const mismatch = toneMismatchScore(input, base);

  const z =
    -0.8 +
    1.35 * abs +
    1.05 * lack +
    0.55 * lenU +
    0.45 * inter +
    0.90 * mismatch;

  const pen = sigmoid(z);
  return Number(clamp01(Math.min(pen, 0.92)).toFixed(3));
}

function softenMore(text: string): string {
  return text
    .replace(/입니다\./g, "일 수 있어요.")
    .replace(/됩니다\./g, "될 가능성이 있어요.")
    .replace(/합니다\./g, "하는 편이에요.")
    .replace(/확정/g, "가설")
    .replace(/결론/g, "정리");
}

function addUncertaintyHint(text: string): string {
  if (/(가능성이|~일 수|추정|대체로|높아 보입니다)/.test(text)) return text;
  return text + " (상황에 따라 달라질 수 있어요.)";
}

export function regressionCorrection(params: {
  input: string;
  base: string;
  epsilon?: number;
  residualPenalty?: number;
}): string {
  const { input, base, epsilon = 0.05 } = params;

  const pen =
    typeof params.residualPenalty === "number"
      ? clamp01(params.residualPenalty)
      : predictResidualPenalty({ input, base });

  if (pen < epsilon) return base + "";

  let out = base;

  if (pen >= 0.05) out = addUncertaintyHint(out);
  if (pen >= 0.12) out = softenMore(out);

  if (pen >= 0.25) {
    out = out
      .replace(/반드시|무조건|절대/gi, "대체로")
      .replace(/확실/gi, "상대적으로");
  }

  if (pen >= 0.45) {
    out = out
      .replace(/명백|완벽|팩트/gi, "가능성이 있는 근거")
      .replace(/확정입니다/gi, "그렇게 볼 여지가 있어요");
  }

  return out;
}
