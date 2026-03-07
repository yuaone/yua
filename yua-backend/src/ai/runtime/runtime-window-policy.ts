// 🔒 PHASE 9-3 Runtime Window Policy (SSOT)
// - 숫자를 "의미 있는 신호"로 바꾸는 계층
// - Rule 생성 ❌
// - Mutation ❌

import type { FailureSurfaceAggregate } from "../telemetry/failure-surface-aggregator";

export type WindowPolicySignal =
  | {
      type: "VERDICT_HOLD_SPIKE";
      path: string;
      count: number;
    }
  | {
      type: "TOOL_FAILURE_BURST";
      path: string;
      tool: string;
      count: number;
    }
  | {
      type: "CONFIDENCE_DROP_CLUSTER";
      path: string;
      count: number;
    };

const HOLD_THRESHOLD = 5;
const TOOL_FAIL_THRESHOLD = 3;
const CONF_DROP_THRESHOLD = 3;

export class RuntimeWindowPolicy {
  static evaluate(
    aggregates: FailureSurfaceAggregate[]
  ): WindowPolicySignal[] {
    const signals: WindowPolicySignal[] = [];

    for (const a of aggregates) {
      if (a.failureKind === "VERDICT_HOLD" && a.count >= HOLD_THRESHOLD) {
        signals.push({
          type: "VERDICT_HOLD_SPIKE",
          path: a.path,
          count: a.count,
        });
      }

      if (
        a.failureKind.startsWith("TOOL_FAIL") &&
        a.count >= TOOL_FAIL_THRESHOLD
      ) {
        const tool = a.failureKind.split(":")[1] ?? "UNKNOWN";
        signals.push({
          type: "TOOL_FAILURE_BURST",
          path: a.path,
          tool,
          count: a.count,
        });
      }

      if (
        a.failureKind === "CONFIDENCE_DROP" &&
        a.count >= CONF_DROP_THRESHOLD
      ) {
        signals.push({
          type: "CONFIDENCE_DROP_CLUSTER",
          path: a.path,
          count: a.count,
        });
      }
    }

    return signals;
  }
}
