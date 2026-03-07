// 🎭 Expression Hint Resolver
// - UI / Prompt hint only
// - Engine control ❌
// - Memory ❌
// - Decision ❌

export type ExpressionHint =
  | "NEUTRAL"
  | "CASUAL"
  | "MEME"
  | "FRIENDLY";

export function resolveExpressionHint(
  message: string
): ExpressionHint {
  const text = message.trim();

  // 밈/감탄
  if (/(ㅋㅋㅋ+|ㅎㅎ+|lol|lmao|wtf)/i.test(text)) {
    return "MEME";
  }

  // 캐주얼
  if (/(야|근데|근데말이야|아니)/i.test(text)) {
    return "CASUAL";
  }

  // 기본
  return "NEUTRAL";
}
