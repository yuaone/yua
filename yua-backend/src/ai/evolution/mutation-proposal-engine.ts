// 🔒 PHASE 9-4 Mutation Proposal Engine (SSOT)
// - 제안만 생성
// - 적용 ❌
// - 자동 변경 ❌

import type { WindowPolicySignal } from "../runtime/runtime-window-policy";

export type MutationProposal = {
  target: "PATH" | "TOOL";
  key: string;
  proposal: string;
  reason: string;
  confidence: number;
};

export class MutationProposalEngine {
  static propose(
    signals: WindowPolicySignal[]
  ): MutationProposal[] {
    const proposals: MutationProposal[] = [];

    for (const s of signals) {
      switch (s.type) {
        case "VERDICT_HOLD_SPIKE":
          proposals.push({
            target: "PATH",
            key: s.path,
            proposal:
              "Increase confidence threshold or relax HOLD guard",
            reason: `HOLD occurred ${s.count} times in window`,
            confidence: Math.min(0.9, 0.5 + s.count * 0.05),
          });
          break;

        case "TOOL_FAILURE_BURST":
          proposals.push({
            target: "TOOL",
            key: s.tool,
            proposal:
              "Increase verifier budget or downgrade tool trust",
            reason: `Tool failed ${s.count} times consecutively`,
            confidence: Math.min(0.9, 0.6 + s.count * 0.05),
          });
          break;

        case "CONFIDENCE_DROP_CLUSTER":
          proposals.push({
            target: "PATH",
            key: s.path,
            proposal:
              "Recalibrate confidence regression baseline",
            reason: `Repeated confidence drops (${s.count})`,
            confidence: Math.min(0.85, 0.5 + s.count * 0.05),
          });
          break;
      }
    }

    return proposals;
  }
}
