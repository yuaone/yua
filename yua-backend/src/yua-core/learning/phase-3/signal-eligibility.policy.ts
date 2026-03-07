// 🔒 YUA SSOT — Signal Eligibility Policy (PHASE 3)
// 목적: "어떤 메타데이터만 학습/통계/진화에 사용 가능한가"를 봉인

export type SignalSource =
  | "JUDGMENT"
  | "SILENCE"
  | "TOOL"
  | "RUNTIME"
  | "FAILURE"
  | "USER_FEEDBACK";

export type EligibleSignalType =
  | "VERDICT"
  | "CONFIDENCE"
  | "UNCERTAINTY"
  | "RISK_SCORE"
  | "RESPONSIBILITY_LEVEL"
  | "PATH"
  | "MODE"
  | "ENGINE"
  | "TOOL_LEVEL"
  | "LATENCY"
  | "ERROR_CODE"
  | "POLICY_FLAG";

export interface RawSignal {
  source: SignalSource;
  type: string;
  value: unknown;
}

export interface EligibleSignal {
  source: SignalSource;
  type: EligibleSignalType;
  value: number | string | boolean;
}

export const SIGNAL_ELIGIBILITY_POLICY = Object.freeze({
  // ✅ 허용되는 Signal Type (화이트리스트)
  allowedTypes: new Set<EligibleSignalType>([
    "VERDICT",
    "CONFIDENCE",
    "UNCERTAINTY",
    "RISK_SCORE",
    "RESPONSIBILITY_LEVEL",
    "PATH",
    "MODE",
    "ENGINE",
    "TOOL_LEVEL",
    "LATENCY",
    "ERROR_CODE",
    "POLICY_FLAG",
  ]),

  // ❌ 절대 흡수 금지 키워드 (방어적)
  forbiddenKeyPatterns: [
    /prompt/i,
    /message/i,
    /content/i,
    /text/i,
    /answer/i,
    /output/i,
    /user/i,
    /email/i,
    /phone/i,
    /token/i,
    /embedding/i,
    /vector/i,
  ],

  // ❌ 문자열 최대 길이 (식별 방지)
  maxStringLength: 64,
});

/* -------------------------------------------------- */
/* ✅ Eligibility Checker                              */
/* -------------------------------------------------- */

export function isEligibleSignal(raw: RawSignal): raw is EligibleSignal {
  if (!SIGNAL_ELIGIBILITY_POLICY.allowedTypes.has(raw.type as any)) {
    return false;
  }

  if (typeof raw.type !== "string") return false;

  for (const pattern of SIGNAL_ELIGIBILITY_POLICY.forbiddenKeyPatterns) {
    if (pattern.test(raw.type)) {
      return false;
    }
  }

  const v = raw.value;

  if (
    typeof v === "number" ||
    typeof v === "boolean"
  ) {
    return true;
  }

  if (typeof v === "string") {
    return v.length <= SIGNAL_ELIGIBILITY_POLICY.maxStringLength;
  }

  return false;
}
