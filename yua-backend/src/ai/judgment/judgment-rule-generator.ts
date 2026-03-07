import { JudgmentFailureStore } from "./judgment-failure-store";
import { JudgmentRule } from "./judgment-rule";
import type { JudgmentInput } from "./judgment-input";

export function generateRuleCandidates(
  store: JudgmentFailureStore,
  threshold = 3
): JudgmentRule[] {
  const frequencyMap = new Map<string, number>();

  // 1️⃣ 최근 failure 로그 집계
  for (const fail of store.getRecent()) {
    const key = fail.input.slice(0, 40).toLowerCase();
    frequencyMap.set(key, (frequencyMap.get(key) ?? 0) + 1);
  }

  const rules: JudgmentRule[] = [];

  // 2️⃣ threshold 초과 패턴만 Rule 후보로 승격
  for (const [triggerHint, count] of frequencyMap.entries()) {
    if (count < threshold) continue;

    rules.push({
      id: `auto_${Math.random().toString(36).slice(2)}`,

      type: "block",

      triggerHint,

      confidence: Math.min(0.9, 0.4 + count * 0.1),

      decay: 0.03,

      source: "failure-log",

      createdAt: Date.now(),

      /**
       * 🔑 최소 match 구현 (PHASE 1)
       *
       * SSOT:
       * - string 입력 유지
       * - JudgmentInput 확장 지원
       * - verdict 생성 ❌
       */
      match(input: string | JudgmentInput): boolean {
        const raw =
          typeof input === "string"
            ? input
            : input.rawInput;

        return raw
          .toLowerCase()
          .includes(triggerHint);
      },
    });
  }

  return rules;
}
