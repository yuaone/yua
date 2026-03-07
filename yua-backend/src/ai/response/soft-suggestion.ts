// 🔥 SoftSuggestion — UI-only, GPT-style
// -------------------------------------
// ✔ AnswerState 기반
// ✔ 문장 생성 ONLY
// ✔ 판단/강제/질문 ❌
// ✔ 최대 2개
// ✔ 언어 감지 포함

import type {
  AnswerState,
  AnswerOpenEnd,
} from "../suggestion/answer-state";

/* ----------------------------------
 * Language detection (heuristic)
 * ---------------------------------- */
export type UILanguage = "ko" | "en" | "ja" | "zh" | "unknown";

export function detectUILanguage(text: string): UILanguage {
  if (/[가-힣]/.test(text)) return "ko";
  if (/[ぁ-んァ-ン]/.test(text)) return "ja";
  if (/[一-龥]/.test(text)) return "zh";
  if (/[a-zA-Z]/.test(text)) return "en";
  return "unknown";
}

/* ----------------------------------
 * Copy tables (KO first)
 * ---------------------------------- */
const KO_COPY: Record<AnswerOpenEnd, string[]> = {
  NEXT_STEP: [
    "원하면, 다음 단계로 이어서 정리해볼 수 있어.",
    "이걸 바탕으로 바로 다음 스텝을 잡아볼까?",
  ],
  COMPARE: [
    "다른 선택지와 비교해보면 더 명확해질 수 있어.",
    "몇 가지 대안을 나란히 놓고 볼 수도 있어.",
  ],
  IMPLEMENT: [
    "실제로 적용하는 흐름까지 같이 볼 수도 있어.",
    "구현 단계로 옮길지 한번 정리해볼까?",
  ],
  VERIFY: [
    "이게 맞는 방향인지 한 번 점검해볼 수도 있어.",
  ],
  SUMMARIZE: [
    "핵심만 한 번 더 정리해볼 수도 있어.",
  ],
};

/* ----------------------------------
 * Builder
 * ---------------------------------- */
export function buildSoftSuggestions(
  answerState: AnswerState,
  answerText: string
): string[] {
  const lang = detectUILanguage(answerText);
  if (lang !== "ko") return []; // 🔒 다국어는 이후 확장

  if (
    answerState.completeness === "FULL" ||
    answerState.openEnds.length === 0
  ) {
    return [];
  }

  const results: string[] = [];

  for (const open of answerState.openEnds) {
    const pool = KO_COPY[open];
    if (!pool || pool.length === 0) continue;

    results.push(
      pool[Math.floor(Math.random() * pool.length)]
    );

    if (results.length >= 2) break; // 🔒 최대 2개
  }

  return results;
}
