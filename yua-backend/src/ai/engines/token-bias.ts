// 📂 src/ai/engines/token-bias.ts
// 🔥 Initial Token Bias Engine — Quantum/HPE Unified (2025.11.29)
// 안전/안정/품질 모두 보완된 FINAL VERSION

export interface TokenBias {
  biasToken?: string;
  weight: number;   // 0 ~ 2 (1 = neutral)
}

function isMeaningfulToken(token: string): boolean {
  if (!token) return false;

  // 의미 없는 토큰 제외
  const blacklist = [
    ".", ",", "?", "!", "…", "-", "~",
    ")", "(", "\"", "'", ":", ";"
  ];

  if (blacklist.includes(token)) return false;

  // 특수문자만 있는 경우 제외
  if (/^[^A-Za-z0-9가-힣]+$/.test(token)) return false;

  return true;
}

export function computeInitialTokenBias(opts: {
  quantumToken?: string;
  hpeHint?: string;
  maxWeight?: number;
  inputLength?: number;  // optional 자동 보정
}): TokenBias {

  const {
    quantumToken,
    hpeHint,
    maxWeight = 1.35,
    inputLength = 20
  } = opts;

  let biasToken: string | undefined = undefined;

  // ----------------------------------------------------
  // 1) Quantum Token 우선
  // ----------------------------------------------------
  if (quantumToken && quantumToken.length === 1 && isMeaningfulToken(quantumToken)) {
    biasToken = quantumToken;
  }

  // ----------------------------------------------------
  // 2) HPE 힌트 (문장 첫 단어 가장 강력)
  // ----------------------------------------------------
  if (!biasToken && hpeHint && hpeHint.length > 0) {
    const first = hpeHint.split(/\s+/)[0]?.trim() ?? "";
    if (isMeaningfulToken(first)) {
      biasToken = first;
    }
  }

  // ----------------------------------------------------
  // 3) BiasToken이 없으면 중립
  // ----------------------------------------------------
  if (!biasToken) {
    return { weight: 1 };
  }

  // ----------------------------------------------------
  // 4) Weight 계산 (짧은 입력 = 강한 bias)
  // ----------------------------------------------------
  const lengthFactor = Math.max(0.85, Math.min(1.0, 20 / inputLength));
  const w = Math.min(maxWeight, maxWeight * lengthFactor);

  return {
    biasToken,
    weight: parseFloat(w.toFixed(3))
  };
}
