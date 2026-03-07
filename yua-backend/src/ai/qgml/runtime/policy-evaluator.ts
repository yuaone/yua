// 🔒 Policy Evaluator (Deterministic)

import {
  PolicyNode,
  QGMLRuntimeState,
  PolicyEvaluationResult,
} from "../types";

export function evaluatePolicies(
  state: QGMLRuntimeState,
  policies: PolicyNode[]
): PolicyEvaluationResult {
  for (const policy of policies) {
    if (!policy.deny) continue;

    for (const keyword of policy.deny) {
      const serialized = JSON.stringify(state).toLowerCase();
      if (serialized.includes(keyword.toLowerCase())) {
        return {
          allowed: false,
          reason: `policy:${policy.name}`,
        };
      }
    }
  }

  return { allowed: true };
}
