export type IntentClass =
  | "FACT"        // 검증 가능한 사실 (출시일, 가격, 정책)
  | "RECOMMEND"   // 추천/가성비/선택 도움
  | "ADVICE"      // 개인 조언/방법
  | "SEARCH";     // 애매하지만 정보 탐색

export function classifyIntent(input: string): IntentClass {
  const text = input.toLowerCase();

  // 1️⃣ FACT — 단정적 사실, 검증 필요
  if (
    text.match(
      /출시|언제|날짜|공식|발표|가격|수치|스펙|버전|정확히|확정/
    )
  ) {
    return "FACT";
  }

  // 2️⃣ RECOMMEND — 선택/추천/가성비
  if (
    text.match(
      /추천|가성비|뭐가 좋아|괜찮은|고를까|선택|비교|순위|얼마야|찾아줘|베스트/
    )
  ) {
    return "RECOMMEND";
  }

  // 3️⃣ ADVICE — 개인 조언, 방법
  if (
    text.match(
      /어떻게 하면|조언|해야 할까|방법|팁|노하우|도와줘|알려줘/
    )
  ) {
    return "ADVICE";
  }

  // 4️⃣ 나머지는 SEARCH
  return "SEARCH";
}
