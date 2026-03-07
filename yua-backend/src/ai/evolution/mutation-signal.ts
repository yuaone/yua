// 🔒 PHASE 9-7 Mutation Signal Generator
// - 절대 적용 ❌
// - 제안만 생성

import type { RuntimeSignal } from "../runtime/signal-registry";

export type MutationProposal = {
  path: string;
  reason: string;
  confidence: number;
  suggestedAction: string;
  basedOn: RuntimeSignal[];
};

export class MutationSignalGenerator {
  static propose(
    path: string,
    signals: RuntimeSignal[]
  ): MutationProposal | null {
    if (signals.length === 0) return null;

    const maxScore = Math.max(...signals.map(s => s.score));

    if (maxScore < 0.6) return null;

    return {
      path,
      reason: "Repeated instability signals detected",
      confidence: Number(maxScore.toFixed(2)),
      suggestedAction:
        "Review confidence threshold / tool budget / verifier policy",
      basedOn: signals,
    };
  }
}
