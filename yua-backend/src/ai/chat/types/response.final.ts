// 🔒 YUA SSOT — Responsefinal
// -------------------------
// 목적:
// - LLM 출력 "구조"만 유도
// - 판단 / 톤 / 감정 / 서술 의도 절대 포함 ❌
// - PromptRuntime → PromptBuilder로 그대로 전달 ONLY

export type ResponseHint = {
  /**
   * 답변의 전개 구조
   * - 무엇을 먼저 말할지의 순서 힌트
   * - 내용 / 판단 / 이유 ❌
   */
  structure?:
    | "direct_answer"              // 바로 답
    | "comparison_then_conclusion" // 비교 → 결론
    | "stepwise_explanation"       // 단계적 설명
    | "problem_solution";          // 문제 → 해결

  /**
   * 정보 밀도 힌트
   * - 양 조절만 의미
   * - tone / 말투 / 감정 ❌
   */
  expansion?:
    | "none"   // 최소
    | "soft"   // 적당히 풀기
    | "guided" // 🔥 방향은 제시, 분량은 제한 (ASSERTIVE용)
    | "full";  // 충분히 설명

  /**
   * 출력 금지 규칙
   * - 내부 사고 노출 방지용
   * - 강제 제약, 해석 없음
   */
  forbid?: {
    reasoning?: true;     // 사고과정 언급 금지
    metaComment?: true;  // "설명해보면", "정리하면" 금지
    narration?: true;    // 상태/진행 발언 금지
    accessLimitation?: boolean; // ⬅ 추가
  };
};
