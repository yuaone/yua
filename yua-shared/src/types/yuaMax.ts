export type YuaMaxV1Input = {
  path: string;
  turnIntent:
    | "QUESTION"
    | "CONTINUATION"
    | "REACTION"
    | "AGREEMENT"
    | "SHIFT";
  turnFlow: "NEW" | "FOLLOW_UP" | "ACK_CONTINUE" | "TOPIC_SHIFT";
  anchorConfidence: number;
  failureRisk: "LOW" | "MEDIUM" | "HIGH";
  verifierVerdict: "PASS" | "WEAK" | "FAIL";
  inputLength: number;
  modality: "TEXT_ONLY" | "IMAGE_ONLY" | "MIXED";
};

export type YuaMaxV1Hint = {
  risk: number;
  uncertainty: number;
  reasons: string[];
  modelVersion: string;
  latencyMs: number;
  recommendedThinkingProfile?: "FAST" | "NORMAL" | "DEEP";
  uiDelayMs?: number;
  minThinkingMs?: number;
};
