// 📂 src/ai/suggestion/answer-state-inferer.ts
// 🔥 AnswerState Inferer — SSOT FINAL
// 역할: "답이 닫혔는지" + "다음 행동 여지가 있는지"만 추론
// ❌ 판단 / 제어 / Flow 결정 금지
// ✅ SuggestionDecisionEngine 전용 입력

import type {
  AnswerState,
  AnswerOpenEnd,
} from "./answer-state";

export function inferAnswerState(args: {
  text: string;
  mode: string;
  analyzed?: AnswerState; // 🔥 Analyzer 결과
}): AnswerState {
  const raw = args.text ?? "";
  const text = raw.trim();
  const openEnds = args.analyzed?.openEnds ?? [];

  /* --------------------------------------------------
   * 1️⃣ COMPLETENESS (답변 닫힘 판단)
   * -------------------------------------------------- */

  const hasConclusionSignal =
    /(결론|정리하면|요약하면|종합하면|결과적으로)/.test(text);

  const endsWithQuestion = /\?$/.test(text);

  const completeness: AnswerState["completeness"] =
    hasConclusionSignal &&
    !endsWithQuestion
      ? "FULL"
      : openEnds.length === 0 && text.length >= 120
      ? "FULL"
      : "PARTIAL";

  /* --------------------------------------------------
   * 3️⃣ CONFIDENCE IMPRESSION
   * - 사용자 인상용
   * - 제안 개수/형태 조절 신호
   * -------------------------------------------------- */

  let confidenceImpression: AnswerState["confidenceImpression"] = "MID";

  if (/(확실|명확|분명|틀림없|보장)/i.test(text)) {
    confidenceImpression = "HIGH";
  } else if (/(아마|가능|보통|일반적으로|대체로)/i.test(text)) {
    confidenceImpression = "MID";
  } else {
    confidenceImpression = "LOW";
  }

  /* --------------------------------------------------
   * 4️⃣ TONE (답변 성격)
   * -------------------------------------------------- */

  const tone: AnswerState["tone"] =
    /(단계|순서|방법|정리)/i.test(text)
      ? "EXPLANATION"
      : "DIRECT";

  /* --------------------------------------------------
   * 5️⃣ FINAL STATE
   * -------------------------------------------------- */

  return {
    completeness,
    openEnds,
    confidenceImpression,
    tone,
  };
}
