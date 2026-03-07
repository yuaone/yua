// 🔥 YUA Internal Stream Line (SSOT SAFE)
// 목적: 소비자 UX 무손상 + 2026~2027 대비
// 주의: 외부 노출 절대 금지

export type StreamLineIntent =
  | "fcs"
  | "detail";

export interface StreamLine {
  text: string;
  intent: StreamLineIntent;
  priority: 1 | 2;
}

/**
 * 모델 출력(raw text)을
 * "절대 안전한 방식"으로 라인 분리 + 태깅
 */
export function tagStreamLines(rawText: string): StreamLine[] {
  if (!rawText || typeof rawText !== "string") return [];

  const lines = rawText
    .split(/\n+/)
    .map(l => l.trim())
    .filter(Boolean);

  return lines.map((text, index): StreamLine => {
    const isFcs =
      index === 0 &&
      text.length <= 40 &&
      /^(결론부터|요약하면|핵심은|먼저 말하면)/.test(text);

    return {
      text,
      intent: isFcs ? "fcs" : "detail",
      priority: isFcs ? 1 : 2,
    };
  });
}
