// 📂 src/ai/decision/conversational-outcome.ts
// 🔒 YUA SSOT — ConversationalOutcome (Single Decision Signal)
// - Decision 단계에서 단 1회 결정
// - ChatEngine/Prompt/Suggestion은 번역/소비만 한다

export type ConversationalOutcome =
  | "CLOSE"
  | "CONTINUE_SOFT"
  | "CONTINUE_HARD";
