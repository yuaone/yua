import type { JudgmentRule } from "../judgment-rule";
import type { JudgmentInput } from "../judgment-input";

export const BlockPrivilegeEscalationRule: JudgmentRule = {
  id: "block.privilege-escalation",
  type: "block",

  confidence: 1.0,
  decay: 0.0,

  source: "system",
  triggerHint: "privilege_or_exploit_keywords",

  createdAt: Date.now(),

  async match(input: string | JudgmentInput): Promise<boolean> {
    const text =
      typeof input === "string"
        ? input.toLowerCase()
        : input.rawInput.toLowerCase();

    return /(sudo|root|chmod|chown|exploit|bypass|권한상승|해킹)/i.test(
      text
    );
  },
};
