import type { SuggestionAffordance, SuggestionContext } from "./suggestionTypes";

export const suggestionCopyMap: Record<
  SuggestionAffordance,
  Partial<Record<SuggestionContext, string[]>>
> = {
  EXPAND: {
    GENERAL: [
      "이걸 예시로 보면 더 이해가 쉬워",
      "조금 더 풀어서 설명할 수도 있어",
      "간단한 예를 하나 들어볼까?",
      "표로 정리하면 한눈에 보여",
      "단계별로 나눠서 볼 수도 있어",
      "짧게 요약한 버전도 만들어줄 수 있어",
    ],
    DESIGN: [
      "구조를 한 단계 더 나눠볼 수 있어",
      "설계 관점에서 다시 정리해볼까?",
      "확장될 경우를 가정해서 볼 수도 있어",
    ],
    CODING: [
      "코드 예시로 보면 바로 감이 와",
      "실제 구현 기준으로 풀어볼까?",
      "에러 안 나게 쓰는 패턴으로 정리해줄게",
    ],
    EMOTION: [
      "조금 더 편하게 풀어서 말해줄 수도 있어",
      "지금 상황 기준으로 정리해볼까?",
    ],
  },
  CLARIFY: {
    GENERAL: [
      "어느 쪽이 더 궁금한지 알려줄래?",
      "상황을 조금만 더 알려주면 좋아",
      "사용하는 대상이 누구야?",
    ],
    CODING: [
      "프론트인지 백엔드인지 알려줄 수 있어?",
      "어느 언어 기준으로 볼까?",
    ],
    EMOTION: [
      "지금은 공감이 필요한지, 해결이 필요한지 궁금해",
      "조금 더 말해도 괜찮아",
    ],
  },
  BRANCH: {
    GENERAL: [
      "두 가지 방향으로 볼 수 있어",
      "간단하게 갈지, 자세히 볼지 나뉘어",
    ],
    DESIGN: [
      "지금 기준 / 미래 확장 기준으로 나뉘어",
      "단순 구조 / 확장 구조 중 선택할 수 있어",
    ],
    CODING: [
      "빠르게 만드는 방법 / 안정적인 방법이 있어",
      "라이브러리 사용 / 직접 구현으로 나뉘어",
    ],
    EMOTION: [
      "정리부터 할지, 행동부터 할지 나뉘어",
      "지금은 쉬는 것도 하나의 선택이야",
    ],
  },
};
