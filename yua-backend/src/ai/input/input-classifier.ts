// 🔒 Input Classifier — SSOT
// - deterministic
// - no async
// - no LLM
// - no side effects

export type InputIntent =
  | "GREETING"
  | "REACTION"
  | "QUESTION"
  | "COMMAND";

export function classifyInput(message: string): InputIntent {
  const text = message.trim();

  // 1️⃣ 너무 짧은 반응
  if (text.length <= 2) {
    return "REACTION";
  }

  // 2️⃣ 인사
  if (/^(안녕|안녕하세요|hi|hello|ㅎㅇ)$/i.test(text)) {
    return "GREETING";
  }

  // 3️⃣ 명령형
  if (/(해줘|해봐|만들어|알려줘|작성해|정리해)/i.test(text)) {
    return "COMMAND";
  }

  // 4️⃣ 기본은 질문
  return "QUESTION";
}
