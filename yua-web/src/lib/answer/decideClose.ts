// src/lib/answer/decideClose.ts
import type { AnswerAnalysis } from "./analyzeAnswer";
import type { CloseSignal } from "./closeTypes";

export function decideClose(
  analysis: AnswerAnalysis
): CloseSignal {
  // 1️⃣ 완결 답변 → CLOSE 없음
  if (!analysis.isExpandable) {
    return {
      intent: "STOP",
      confidence: "HIGH",
      show: false,
      priority: "LOW",
    };
  }

  // 🔥 1.5️⃣ 짧지만 '설명으로 충분한' 답변 (VISION / 요약 / 판단)
  // 👉 여기 추가
  if (
    analysis.isShortAnswer &&
    analysis.paragraphCount === 1 &&
    analysis.sentenceCount >= 2
  ) {
    return {
      intent: "STOP",
      confidence: "MID",
      show: false,      // ❗️아예 안 띄움
      priority: "LOW",
    };
  }

  // 2️⃣ 너무 짧거나 애매 (진짜 불완전)
  if (analysis.isShortAnswer) {
    return {
      intent: "VERIFY",
      confidence: "LOW",
      show: true,
      priority: "HIGH",
    };
  }

  // 3️⃣ 설명형
  if (analysis.isExplanationLike) {
    return {
      intent: "CONTINUE",
      confidence: "MID",
      show: true,
      priority: "NORMAL",
    };
  }

  // 4️⃣ 기본 적용 유도
  return {
    intent: "APPLY",
    confidence: "MID",
    show: true,
    priority: "NORMAL",
  };
}
