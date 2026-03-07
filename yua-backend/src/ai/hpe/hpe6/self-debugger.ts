// 📂 src/ai/hpe/6.0/self-debugger.ts

import { HPE6Issue } from "./self-checker";

export interface HPE6Patch {
  target: string;
  action: string;
  apply: (result: any) => any;
}

export const SelfDebugger = {
  analyze(issues: HPE6Issue[]): HPE6Patch[] {
    const patches: HPE6Patch[] = [];

    for (const issue of issues) {
      // 1) provider empty → 기본 문구로 fallback
      if (issue.type === "provider_failure" && issue.location) {
        patches.push({
          target: issue.location,
          action: "apply_fallback_output",

          apply: (result: any) => {
            const [root, key] = issue.location!.split(".");
            if (result[root] && result[root][key]) {
              result[root][key].output = "[Auto-Healed: Provider Empty Output]";
            }
            return result;
          },
        });
      }

      // 2) consensus missing → safe fallback
      if (issue.type === "consensus_missing") {
        patches.push({
          target: "consensus.majority",
          action: "set_safe_default",

          apply: (result: any) => {
            result.consensus.majority = "unknown";
            return result;
          },
        });
      }

      // 3) prediction missing
      if (issue.type === "prediction_missing") {
        patches.push({
          target: "prediction.forecast",
          action: "set_safe_forecast",

          apply: (result: any) => {
            result.prediction.forecast =
              "Unable to predict (auto-healed fallback)";
            return result;
          },
        });
      }
    }

    return patches;
  },
};
