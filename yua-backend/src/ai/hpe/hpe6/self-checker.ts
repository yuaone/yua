// 📂 src/ai/hpe/6.0/self-checker.ts

export interface HPE6Issue {
  type: string;
  detail: string;
  location?: string;
}

export const SelfChecker = {
  inspect(result: any): HPE6Issue[] {
    const issues: HPE6Issue[] = [];

    if (!result) {
      issues.push({
        type: "null_result",
        detail: "HPE Engine returned null.",
      });
      return issues;
    }

    // 1) Provider 실패
    const providers = ["gptMain", "gemini", "claude"];
    for (const p of providers) {
      if (!result.verification?.[p]?.output) {
        issues.push({
          type: "provider_failure",
          detail: `${p} provider returned empty output.`,
          location: `verification.${p}`,
        });
      }
    }

    // 2) Majority 누락
    if (!result.consensus?.majority) {
      issues.push({
        type: "consensus_missing",
        detail: "Consensus majority value is missing.",
        location: "consensus.majority",
      });
    }

    // 3) Prediction 누락
    if (!result.prediction?.forecast) {
      issues.push({
        type: "prediction_missing",
        detail: "Predictive forecast missing.",
        location: "prediction.forecast",
      });
    }

    // 4) 타입 검사
    if (typeof result.verification !== "object") {
      issues.push({
        type: "type_mismatch",
        detail: "verification must be an object.",
        location: "verification",
      });
    }

    return issues;
  },
};
