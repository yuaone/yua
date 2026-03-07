// 🔒 Judgment Rule Bootstrap — SSOT FINAL (Upgraded)

import type { JudgmentRegistry } from "./judgment-registry";
import type { JudgmentRule } from "./judgment-rule";
import type { JudgmentInput } from "./judgment-input";

/**
 * 🔥 서버 시작 시 호출
 */
export function bootstrapJudgmentRules(
  registry: JudgmentRegistry
): void {
  registry.add(blockDeepMathRule());
}

/* --------------------------------------------------
 * Rule Definitions
 * -------------------------------------------------- */

/**
 * 🚫 BLOCK: 수학 증명 + 높은 구조 복잡도
 *
 * 의도:
 * - "증명해줘" + 실제 타겟/조건 없음
 * - GPT식 장황한 헛설명 차단
 */
function blockDeepMathRule(): JudgmentRule {
  return {
    id: "block.deep-math.without-target",

    type: "block",

    /**
     * 영향도
     * - 단일 rule로 verdict를 만들지는 않음
     */
    confidence: 0.9,

    decay: 0.05,

    source: "manual",

    triggerHint: "math-proof-without-target",

    createdAt: Date.now(),

    /**
     * 🔑 핵심: match 로직
     */
    async match(
      input: string | JudgmentInput
    ): Promise<boolean> {
      if (typeof input === "string") return false;

      const { math, rawInput } = input;

      if (!math) return false;

      const isProofIntent =
        math.isProofLike ||
        /(증명|prove|proof)/i.test(rawInput);

      const lacksConcreteTarget =
        rawInput.length < 20 ||
        !/(=|정리|theorem|조건|수식)/i.test(rawInput);

      return (
        isProofIntent &&
        lacksConcreteTarget &&
        math.maxNestingDepth >= 3 &&
        math.symbolicDensity >= 0.6
      );
    },
  };
}
