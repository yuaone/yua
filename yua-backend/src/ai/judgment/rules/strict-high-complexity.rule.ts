import type { JudgmentRule } from "../judgment-rule";
import type { JudgmentInput } from "../judgment-input";

export const StrictHighComplexityRule: JudgmentRule = {
  id: "strict.high-complexity",
  type: "strict",

  confidence: 0.6,
  decay: 0.1,

  source: "system",
  triggerHint: "high_code_or_math_complexity",

  createdAt: Date.now(),

  async match(input: string | JudgmentInput): Promise<boolean> {
    // legacy string 입력은 구조 정보 없으므로 strict 발동 ❌
    if (typeof input === "string") {
      return false;
    }

    const { code, math, path, priority, requiresGPU } =
      input;

    let riskyCode = false;
    let complexMath = false;

    if (code) {
      riskyCode =
        code.maxDepth >= 12 ||
        code.mutationScore >= 0.7 ||
        code.hasEval === true ||
        code.hasPrivilegeKeyword === true;
    }

    if (math) {
      complexMath =
        math.symbolicDensity >= 0.75 ||
        math.isProofLike === true ||
        math.maxNestingDepth >= 6;
    }

    const schedulerHint =
      priority === "HIGH" || requiresGPU === true;

    return (
      path === "DEEP" &&
      (riskyCode || complexMath || schedulerHint)
    );
  },
};
