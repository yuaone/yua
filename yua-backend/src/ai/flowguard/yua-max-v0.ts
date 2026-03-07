export type YuaMaxV0Input = {
  path: string;
  turnIntent: string;
  turnFlow?: string;
  anchorConfidence: number;
  failureRisk?: "LOW" | "MEDIUM" | "HIGH";
  verifierVerdict?: "PASS" | "WEAK" | "FAIL";
  hasImage: boolean;
  hasText: boolean;
  inputLength: number;
};

export type YuaMaxHint = {
  version: "v0";
  risk: number;
  uncertainty: number;
  recommendedThinkingProfile?: "FAST" | "NORMAL" | "DEEP";
  uiDelayMs?: number;
  reasons: string[];
};

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-z));
}

function scoreFailureRisk(risk?: "LOW" | "MEDIUM" | "HIGH"): number {
  if (risk === "HIGH") return 1.0;
  if (risk === "MEDIUM") return 0.6;
  if (risk === "LOW") return 0.2;
  return 0.4;
}

function scoreVerdict(verdict?: "PASS" | "WEAK" | "FAIL"): number {
  if (verdict === "FAIL") return 1.0;
  if (verdict === "WEAK") return 0.6;
  if (verdict === "PASS") return 0.2;
  return 0.4;
}

function scorePath(path: string): number {
  if (path === "SEARCH") return 0.7;
  if (path === "DEEP") return 0.8;
  if (path === "FAST") return 0.2;
  return 0.4;
}

function scoreTurnFlow(flow?: string): number {
  if (flow === "TOPIC_SHIFT") return 0.4;
  if (flow === "FOLLOW_UP") return 0.3;
  if (flow === "ACK_CONTINUE") return 0.2;
  if (flow === "NEW") return 0.1;
  return 0.2;
}

function lengthNorm(n: number): number {
  return clamp01(Math.log1p(Math.max(0, n)) / 8);
}

export function evaluateYuaMaxV0(
  input: YuaMaxV0Input
): YuaMaxHint {
  const failureScore = scoreFailureRisk(input.failureRisk);
  const verdictScore = scoreVerdict(input.verifierVerdict);
  const pathScore = scorePath(input.path);
  const flowScore = scoreTurnFlow(input.turnFlow);
  const anchorLow = clamp01(1 - input.anchorConfidence);
  const lenScore = lengthNorm(input.inputLength);

  const b = -0.4;
  const wFailure = 1.2;
  const wVerdict = 0.9;
  const wAnchorLow = 0.8;
  const wPath = 0.4;
  const wFlow = 0.2;
  const wLen = 0.3;

  const z =
    b +
    wFailure * failureScore +
    wVerdict * verdictScore +
    wAnchorLow * anchorLow +
    wPath * pathScore +
    wFlow * flowScore +
    wLen * lenScore;

  const risk = clamp01(sigmoid(z));
  const uncertainty = clamp01(
    1 - Math.abs(risk - 0.5) * 2
  );

  const reasons: string[] = [];
  if (input.failureRisk === "HIGH") reasons.push("FS_HIGH");
  if (input.failureRisk === "MEDIUM") reasons.push("FS_MEDIUM");
  if (input.verifierVerdict === "FAIL") reasons.push("VERDICT_FAIL");
  if (input.verifierVerdict === "WEAK") reasons.push("VERDICT_WEAK");
  if (anchorLow >= 0.6) reasons.push("LOW_ANCHOR");
  if (lenScore >= 0.6) reasons.push("LONG_INPUT");
  if (input.turnFlow === "TOPIC_SHIFT") reasons.push("TOPIC_SHIFT");

  let recommendedThinkingProfile: YuaMaxHint["recommendedThinkingProfile"];
  let uiDelayMs: number | undefined;

  if (input.hasImage) {
    recommendedThinkingProfile = "FAST";
  } else if (
    input.failureRisk === "HIGH" ||
    input.verifierVerdict === "FAIL"
  ) {
    recommendedThinkingProfile = "DEEP";
    uiDelayMs = 400;
  } else if (risk >= 0.65) {
    recommendedThinkingProfile = "DEEP";
  } else {
    recommendedThinkingProfile = "NORMAL";
  }

  return {
    version: "v0",
    risk,
    uncertainty,
    recommendedThinkingProfile,
    uiDelayMs,
    reasons,
  };
}
