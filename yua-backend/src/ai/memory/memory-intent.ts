export type MemoryIntent =
  | "NONE"
  | "CONTEXT"
  | "ARCHITECTURE"
  | "DECISION"
  | "REMEMBER";

export function detectMemoryIntent(text: string): MemoryIntent {
  const t = text.toLowerCase();

  if (
    [
      "기억",
      "기억해",
      "잊지마",
      "앞으로",
      "앞으로 참고해",
      "저장",
      "저장해줘",
      "내 설정은",
      "장기 메모리",
      "remember",
      "ssot",
      "longterm",
      "long-term",
      "장기메모리업데이트",
      "단기메모리업데이트",
    ].some((k) => t.includes(k))
  ) {
    return "REMEMBER";
  }

  if (
    ["아키텍처", "구조", "설계", "architecture"].some((k) =>
      t.includes(k)
    )
  ) {
    return "ARCHITECTURE";
  }

  if (
    ["왜", "판단", "결정", "근거", "해석"].some((k) =>
      t.includes(k)
    )
  ) {
    return "DECISION";
  }

  if (
    ["이전", "방금", "앞에서", "전 대화에서"].some((k) =>
      t.includes(k)
    )
  ) {
    return "CONTEXT";
  }

  return "NONE";
}
