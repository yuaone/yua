// 📂 src/yua-core/judgment/scope/judgment-scope.definition.ts
// 🔒 YUA SSOT — Judgment Scope Definition (PHASE 2)
// 목적: Judgment가 "무엇을 하는가"가 아니라, "무엇을 절대 하지 않는가"를 봉인한다.
// 규칙: 이 파일은 앱 기능 확장을 위해 수정되지 않는다. (확장=추가 파일로만)

// ⚠️ NOTE
// - Judgment는 Business Logic(업무결정)을 하지 않는다.
// - Judgment는 Data Plane(업무 처리)이 아니라 Control Plane(안전/책임/침묵/경계)이다.
// - 출력은 이산적(Discrete) 제어 신호로만 제한한다.

export type JudgmentVerdict =
  | "APPROVE" // 진행 허용
  | "DEFER"   // 보류(추가 확인/추가 정보 요구)
  | "BLOCK"   // 차단(안전/정책/책임)
  | "SILENCE"; // 명시적 침묵(최소 정보만 전달 후 종료)

export type JudgmentControlSignal =
  | "ALLOW"
  | "DENY"
  | "ASK_ONE_QUESTION"
  | "SILENCE_EXPLICIT";

export type ResponsibilityLevel =
  | "R0_NONE"          // 책임 없음 (일반)
  | "R1_LOW"           // 낮은 책임
  | "R2_MEDIUM"        // 중간 책임 (민감 가능)
  | "R3_HIGH"          // 높은 책임 (법/보안/금융/권한)
  | "R4_CRITICAL";     // 최상 책임 (규제/치명 영향)

export type JudgmentScope =
  // ✅ Judge-able (허용 범위)
  | "SAFETY"
  | "SECURITY"
  | "PRIVACY"
  | "LEGAL_RISK"
  | "FINANCIAL_RISK"
  | "POLICY"
  | "RESPONSIBILITY"
  | "UNCERTAINTY"
  | "SILENCE"
  // ❌ Non-judge-able (금지 범위)
  | "BUSINESS_LOGIC"
  | "PRICING_DECISION"
  | "CREDIT_DECISION"
  | "MEDICAL_DECISION"
  | "LAWYER_ADVICE"
  | "COMPLIANCE_FINAL_CALL"
  | "OPERATIONS_DECISION";

export interface JudgmentScopeDecision {
  // 식별자 (감사/재현)
  decisionId: string;

  // 어떤 스코프가 트리거 되었는지 (Control Plane)
  scope: JudgmentScope;

  // 이산적 출력만 허용
  verdict: JudgmentVerdict;
  signal: JudgmentControlSignal;

  // 사용자에게 보여줄 최소 문구 (UI/스트림에 사용 가능)
  // - 여기서 "장문 답변" 생성 금지
  messageForUser?: string;

  // 내부 추적
  reasonCode: string; // 예: "PRIVACY_RISK", "LOW_CONFIDENCE", "SECURITY_ESCALATION"
  responsibility: ResponsibilityLevel;

  // 신뢰/불확실성 메타
  confidence: number;       // 0~1 (판단 자신감)
  uncertainty: number;      // 0~1 (1-confidence가 아님. 별도 계산 가능)
  riskScore?: number;       // 0~1 (선택)
  requiresHumanReview?: boolean;

  // 정책 플래그 (로깅/관측용)
  policyFlags?: string[];

  // 질문은 최대 1개만 (이탈 방지 + 범위 폭발 방지)
  // signal이 ASK_ONE_QUESTION일 때만 사용
  oneQuestion?: string;

  // 증빙 가능성
  explainability: {
    // 규제/감사 대응: "왜 침묵/차단했는지"만 설명 가능하면 충분
    shortRationale: string; // 짧고 명확 (최대 1~2문장 권장)
    references?: string[];  // 내부 정책 문서 키(링크 아님)
  };

  // 불변성 태그 (SSOT)
  ssot: {
    version: "YUA-JUDGMENT-SCOPE-1.0";
    immutable: true;
  };
}

/* -------------------------------------------------- */
/* 🔒 SSOT INVARIANTS (절대 불변 규칙)                  */
/* -------------------------------------------------- */

export const JUDGMENT_SCOPE_SSOT = Object.freeze({
  version: "YUA-JUDGMENT-SCOPE-1.0",

  // Judgment는 절대 "업무 결정을" 하지 않는다.
  // (업무결정은 Expression/Domain layer 또는 외부 시스템의 책임)
  forbiddenResponsibilities: [
    "BUSINESS_LOGIC",
    "PRICING_DECISION",
    "CREDIT_DECISION",
    "MEDICAL_DECISION",
    "LAWYER_ADVICE",
    "COMPLIANCE_FINAL_CALL",
    "OPERATIONS_DECISION",
  ] as const satisfies ReadonlyArray<JudgmentScope>,

  // Judgment가 할 수 있는 것: "하지 말아야 할 것"을 결정
  allowedScopes: [
    "SAFETY",
    "SECURITY",
    "PRIVACY",
    "LEGAL_RISK",
    "FINANCIAL_RISK",
    "POLICY",
    "RESPONSIBILITY",
    "UNCERTAINTY",
    "SILENCE",
  ] as const satisfies ReadonlyArray<JudgmentScope>,

  // 출력은 항상 이산 신호 (조합 폭발 방지)
  allowedSignals: [
    "ALLOW",
    "DENY",
    "ASK_ONE_QUESTION",
    "SILENCE_EXPLICIT",
  ] as const satisfies ReadonlyArray<JudgmentControlSignal>,

  // 질문은 최대 1개 (사용자 이탈 방지용 "최소 질문"만 허용)
  maxQuestions: 1,

  // 기본 전략:
  // - Drift/불확실성이 커질수록 "추가 규칙"은 허용되지만
  // - 기존 규칙을 수정해서 behavior를 바꾸지 말고
  // - 보수적으로 "차단/침묵"을 추가하는 방식만 허용
  evolutionPolicy: {
    preferAdditiveGuards: true,
    avoidMutatingExistingRules: true,
    degradeToSilenceOnUncertainty: true,
  },
} as const);

/* -------------------------------------------------- */
/* ✅ TYPE GUARDS                                      */
/* -------------------------------------------------- */

export function isAllowedScope(scope: JudgmentScope): boolean {
  return (JUDGMENT_SCOPE_SSOT.allowedScopes as readonly string[]).includes(scope);
}

export function isForbiddenScope(scope: JudgmentScope): boolean {
  return (JUDGMENT_SCOPE_SSOT.forbiddenResponsibilities as readonly string[]).includes(scope);
}

export function isAllowedSignal(signal: JudgmentControlSignal): boolean {
  return (JUDGMENT_SCOPE_SSOT.allowedSignals as readonly string[]).includes(signal);
}

/* -------------------------------------------------- */
/* ✅ VALIDATOR (런타임 방어)                           */
/* -------------------------------------------------- */

export function assertScopeDecision(decision: JudgmentScopeDecision): void {
  if (!decision || typeof decision !== "object") {
    throw new Error("[SSOT] Invalid JudgmentScopeDecision: not an object");
  }

  if (decision.ssot?.immutable !== true || decision.ssot?.version !== JUDGMENT_SCOPE_SSOT.version) {
    throw new Error("[SSOT] JudgmentScopeDecision missing or mismatched ssot tag");
  }

  if (!isAllowedSignal(decision.signal)) {
    throw new Error(`[SSOT] Unsupported signal: ${String(decision.signal)}`);
  }

  // 금지 영역으로 들어오면 즉시 실패 (개발 단계에서 바로 잡게)
  if (isForbiddenScope(decision.scope)) {
    throw new Error(
      `[SSOT] Forbidden scope used in Judgment: ${decision.scope}. ` +
        `Judgment must not implement business logic or final compliance decisions.`
    );
  }

  // 질문 제한
  if (decision.signal === "ASK_ONE_QUESTION") {
    if (!decision.oneQuestion || typeof decision.oneQuestion !== "string") {
      throw new Error("[SSOT] ASK_ONE_QUESTION requires oneQuestion string");
    }
  } else {
    if (decision.oneQuestion !== undefined) {
      throw new Error("[SSOT] oneQuestion must be undefined unless ASK_ONE_QUESTION");
    }
  }

  // confidence/uncertainty 범위
  if (Number.isNaN(decision.confidence) || decision.confidence < 0 || decision.confidence > 1) {
    throw new Error("[SSOT] confidence must be in [0,1]");
  }
  if (Number.isNaN(decision.uncertainty) || decision.uncertainty < 0 || decision.uncertainty > 1) {
    throw new Error("[SSOT] uncertainty must be in [0,1]");
  }
}

/* -------------------------------------------------- */
/* ✅ FACTORY HELPERS (표준화)                          */
/* -------------------------------------------------- */

function base(decisionId: string): Pick<JudgmentScopeDecision, "decisionId" | "ssot"> {
  return {
    decisionId,
    ssot: { version: "YUA-JUDGMENT-SCOPE-1.0", immutable: true },
  };
}

export function approveDecision(args: {
  decisionId: string;
  scope?: JudgmentScope;
  confidence: number;
  uncertainty: number;
  reasonCode?: string;
  responsibility?: ResponsibilityLevel;
}): JudgmentScopeDecision {
  const d: JudgmentScopeDecision = {
    ...base(args.decisionId),
    scope: args.scope ?? "POLICY",
    verdict: "APPROVE",
    signal: "ALLOW",
    reasonCode: args.reasonCode ?? "OK",
    responsibility: args.responsibility ?? "R0_NONE",
    confidence: args.confidence,
    uncertainty: args.uncertainty,
    explainability: {
      shortRationale: "요청은 정책 및 안전 기준을 충족했습니다.",
    },
  };
  assertScopeDecision(d);
  return d;
}

export function blockDecision(args: {
  decisionId: string;
  scope: JudgmentScope;
  confidence: number;
  uncertainty: number;
  reasonCode: string;
  responsibility: ResponsibilityLevel;
  messageForUser?: string;
  policyFlags?: string[];
  riskScore?: number;
}): JudgmentScopeDecision {
  const d: JudgmentScopeDecision = {
    ...base(args.decisionId),
    scope: args.scope,
    verdict: "BLOCK",
    signal: "DENY",
    messageForUser: args.messageForUser,
    reasonCode: args.reasonCode,
    responsibility: args.responsibility,
    confidence: args.confidence,
    uncertainty: args.uncertainty,
    riskScore: args.riskScore,
    policyFlags: args.policyFlags,
    explainability: {
      shortRationale: "안전/정책/책임 기준에 따라 요청을 차단했습니다.",
    },
  };
  assertScopeDecision(d);
  return d;
}

export function silenceDecision(args: {
  decisionId: string;
  scope: JudgmentScope;
  confidence: number;
  uncertainty: number;
  reasonCode: string;
  responsibility: ResponsibilityLevel;
  messageForUser?: string;
  policyFlags?: string[];
  riskScore?: number;
}): JudgmentScopeDecision {
  const d: JudgmentScopeDecision = {
    ...base(args.decisionId),
    scope: args.scope,
    verdict: "SILENCE",
    signal: "SILENCE_EXPLICIT",
    messageForUser: args.messageForUser ?? "안전 또는 책임 기준에 따라 답변을 중단했습니다.",
    reasonCode: args.reasonCode,
    responsibility: args.responsibility,
    confidence: args.confidence,
    uncertainty: args.uncertainty,
    riskScore: args.riskScore,
    policyFlags: args.policyFlags,
    explainability: {
      shortRationale: "불확실성 또는 책임 리스크가 높아, 최소 정보만 제공하고 중단했습니다.",
    },
  };
  assertScopeDecision(d);
  return d;
}

export function askOneQuestionDecision(args: {
  decisionId: string;
  scope: JudgmentScope;
  confidence: number;
  uncertainty: number;
  reasonCode: string;
  responsibility: ResponsibilityLevel;
  oneQuestion: string;
  messageForUser?: string;
  policyFlags?: string[];
}): JudgmentScopeDecision {
  const d: JudgmentScopeDecision = {
    ...base(args.decisionId),
    scope: args.scope,
    verdict: "DEFER",
    signal: "ASK_ONE_QUESTION",
    messageForUser: args.messageForUser ?? "진행 전에 확인할 게 1가지 있어요.",
    oneQuestion: args.oneQuestion,
    reasonCode: args.reasonCode,
    responsibility: args.responsibility,
    confidence: args.confidence,
    uncertainty: args.uncertainty,
    policyFlags: args.policyFlags,
    explainability: {
      shortRationale: "필수 정보가 부족하여 1개 질문으로 범위를 확정합니다.",
    },
  };
  assertScopeDecision(d);
  return d;
}
