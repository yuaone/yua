import type { JudgmentRule } from "../judgment-rule";
import type { JudgmentInput } from "../judgment-input";

export const DeferInsufficientTargetRule: JudgmentRule = {
  id: "defer.insufficient-target",
  type: "defer",

  confidence: 0.8,
  decay: 0.05,

  source: "system",
  triggerHint: "proof_or_analysis_without_concrete_target",

  createdAt: Date.now(),

  async match(input: string | JudgmentInput): Promise<boolean> {
    const text =
      typeof input === "string"
        ? input
        : input.rawInput;

    const isProofLike =
      /(증명|prove|proof|분석|analysis|평가|benchmark)/i.test(
        text
      );

    const hasConcreteTarget =
      /(=|정리|theorem|정의|조건|수식|변수|식)/i.test(
        text
      );

    // 증명/분석 요청인데 대상이 없음
    return isProofLike && !hasConcreteTarget;
  },
};
