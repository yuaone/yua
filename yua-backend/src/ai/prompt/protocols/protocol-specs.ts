/* -------------------------------------------------------------------------- */
/* Protocol Spec Types (SSOT — Soft Guidance Version)                          */
/* -------------------------------------------------------------------------- */

export type ThinkingDepth =
  | "LIGHT"
  | "STANDARD"
  | "DENSE"
  | "FORMAL";

export type FallbackStrategy =
  | "REFRAME"
  | "PROVIDE_CONTEXT"
  | "EXPLAIN_LIMITS";

export type ProtocolIntent =
  | "FACT"
  | "DESIGN"
  | "ADVICE"
  | "RESEARCH";

/**
 * 🧠 ProtocolSpec
 * - 사고를 "강제"하지 않는다
 * - 모델이 참고할 수 있는 사고 힌트만 제공
 */
export interface ProtocolSpec {
  /**
   * 권장 사고 관점 (구조 힌트)
   * → 섹션을 써도 되고, 자연어로 풀어도 된다
   */
  suggestedConsiderations?: readonly string[];

  /**
   * 사고 방향 / 강조 포인트
   * → 자연어 힌트로만 사용
   */
  emphasis?: readonly string[];

  /**
   * 피하면 좋은 표현/접근
   * → 금지 ❌, 경고/주의 수준
   */
  discouragedPatterns?: readonly string[];

  /**
   * 기본 사고 밀도
   * → PromptBuilderDeep의 depth hint로만 사용
   */
  depthBias: ThinkingDepth;

  /**
   * 사고가 막힐 때의 권장 대응
   * → Runtime / UI 참고용
   */
  fallbackStrategy: FallbackStrategy;

  /**
   * 어떤 intent에 주로 어울리는지
   * → Decision Engine 참고용
   */
  applicableIntents?: readonly ProtocolIntent[];
}

/* -------------------------------------------------------------------------- */
/* Protocol Specs (SSOT — GPT-like Reasoning Hints)                            */
/* -------------------------------------------------------------------------- */

export const PROTOCOL_SPECS: Record<string, ProtocolSpec> = {
  ENGINEERING_DESIGN: {
    suggestedConsiderations: [
      "문제를 다시 정리해보는 것",
      "현실적인 제약 조건",
      "가능한 설계 대안",
      "실패하거나 깨질 수 있는 지점",
      "운영 및 유지보수 관점",
      "왜 이 선택을 하는지에 대한 이유",
    ],
    emphasis: [
      "실제 구현 가능성",
      "운영 중 발생 가능한 문제",
      "점진적 개선",
    ],
    discouragedPatterns: [
      "추상적인 접근만 제시하는 설명",
      "현실 제약을 무시한 이상적인 설계",
    ],
    depthBias: "STANDARD",
    fallbackStrategy: "REFRAME",
    applicableIntents: ["DESIGN", "ADVICE"],
  },

  SYSTEM_ARCHITECTURE: {
    suggestedConsiderations: [
      "구성 요소 간 책임과 경계",
      "데이터 흐름",
      "제어 흐름",
      "단일 장애 지점",
      "확장 시 고려 사항",
    ],
    emphasis: [
      "책임 분리",
      "확장성",
      "관측 가능성",
    ],
    discouragedPatterns: [
      "세부 구현에 과도하게 집착하는 설명",
    ],
    depthBias: "STANDARD",
    fallbackStrategy: "PROVIDE_CONTEXT",
    applicableIntents: ["DESIGN", "RESEARCH"],
  },

  RESEARCH_REASONING: {
    suggestedConsiderations: [
      "이미 확인된 사실",
      "아직 가설인 부분",
      "반례 가능성",
      "현재 접근의 한계",
      "추가로 연구할 수 있는 방향",
    ],
    emphasis: [
      "사실과 가설의 구분",
      "검증 가능성",
    ],
    discouragedPatterns: [
      "근거 없이 단정하는 표현",
    ],
    depthBias: "DENSE",
    fallbackStrategy: "EXPLAIN_LIMITS",
    applicableIntents: ["FACT", "RESEARCH"],
  },

  THEOREM_ANALYSIS: {
    suggestedConsiderations: [
      "정의와 전제",
      "가정",
      "중간 정리",
      "증명의 큰 흐름",
      "적용 범위와 한계",
    ],
    emphasis: [
      "논리적 완결성",
      "형식적 정확성",
    ],
    discouragedPatterns: [
      "직관에만 의존한 설명",
      "논리 단계를 건너뛰는 전개",
    ],
    depthBias: "FORMAL",
    fallbackStrategy: "EXPLAIN_LIMITS",
    applicableIntents: ["RESEARCH"],
  },

  /**
   * 🔒 모든 질문을 흡수하는 기본 프로토콜
   */
  GENERAL_REASONING: {
    suggestedConsiderations: [
      "문제를 어떻게 이해할 수 있는지",
      "중요한 고려 요소",
      "가능한 선택지",
      "현재 상황에서의 합리적인 결론",
    ],
    depthBias: "LIGHT",
    fallbackStrategy: "PROVIDE_CONTEXT",
  },
} as const;
