// 📂 src/utils/tokenizer.ts
// 🔥 YUA-AI Token Estimator — UPGRADED 2026.01
// SSOT: Guard / Preflight / Stream-safe estimator

export function estimateTokens(text: string): number {
  if (!text) return 0;

  const cleaned = sanitize(text);

  const korean = count(/[가-힣]/g, cleaned);
  const english = count(/[a-zA-Z]/g, cleaned);
  const number = count(/[0-9]/g, cleaned);
  const symbol = count(/[^0-9a-zA-Z가-힣\s]/g, cleaned);
  const uppercase = count(/[A-Z]/g, cleaned);

  const words = countWords(cleaned);
  const lines = cleaned.split("\n").length;

  // 📦 코드/JSON/시스템 블록 감지
  const codeBlocks = count(/```/g, cleaned) / 2;
  const jsonLike = count(/[{}[\]]/g, cleaned);
  const systemHints = count(
    /(SYSTEM|You are|Rules:|Mandatory rules|SSOT|FACT BOUNDARY)/gi,
    cleaned
  );

  let est =
    korean * 1.7 +
    english * 0.6 +
    number * 0.3 +
    symbol * 0.9 +
    uppercase * 0.2 +
    words * 0.4 +
    lines * 0.3 +
    cleaned.length * 0.05;

  // 🔒 구조 가중치 (STREAM-SAFE 완화)
  // 코드 블록은 "폭발 방지" 목적이므로 과대 가중치 금지
  est += codeBlocks * 40;

  // JSON/구조 문자는 보조 신호만
  est += Math.min(jsonLike * 0.15, 120);

  // 시스템 힌트는 입력 차단이 아니라 경고용
  est += Math.min(systemHints * 4, 80);

  // 🔒 Stream 안정화 바닥값
  if (cleaned.length > 0) {
    est = Math.max(est, 8);
  }

  // 🔒 Soft cap (입력 차단 과잉 방지)
  // estimator 폭주 방지용 — 실제 토큰 수 아님
  const SOFT_CAP = cleaned.length * 1.2;
  if (est > SOFT_CAP) {
    est = SOFT_CAP;
  }

  return Math.ceil(est);
}

/* -------------------------------------------------- */

function count(regex: RegExp, str: string): number {
  return (str.match(regex) || []).length;
}

function countWords(str: string): number {
  if (!str) return 0;
  return str
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function sanitize(str: string): string {
  if (!str) return "";
  return str
    .replace(/\r\n/g, "\n")
    .replace(/\n+/g, "\n")
    .replace(/\s\s+/g, " ")
    .trim();
}
