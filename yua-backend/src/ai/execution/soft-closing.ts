type ClosingStyle = "QUESTION" | "STATEMENT" | "NEUTRAL";

const CLOSING_POOL: Record<ClosingStyle, string[]> = {
  QUESTION: [
    "어디를 더 이어서 볼까?",
    "이 다음으로 어떤 부분이 궁금해?",
    "여기서 더 파볼까?",
  ],
  STATEMENT: [
    "여기까지가 핵심이야.",
    "이 정도면 흐름은 잡혔어.",
    "이 지점까지는 정리됐어.",
  ],
  NEUTRAL: [
    "필요한 부분부터 이어가면 돼.",
    "원하면 다음 단계로 넘어갈 수 있어.",
  ],
};

export function pickSoftClosing(style: ClosingStyle): string {
  const list = CLOSING_POOL[style];
  return list[Math.floor(Math.random() * list.length)];
}
