// src/ai/ml/decision-ml-bridge.ts
import { spawn } from "child_process";
import path from "path";
import type { MLInput } from "./ml-input";

export interface MLDecisionRisk {
  risk: number; // 0 ~ 1
  level: "LOW" | "MEDIUM" | "HIGH";
}

/**
 * 🔒 Decision Risk Inference (SSOT)
 * - Decision / Judgment 이후
 * - verdict ❌
 * - 정량 신호만 사용
 */
export async function inferDecisionRiskML(
  input: MLInput
): Promise<MLDecisionRisk | null> {
  return new Promise((resolve) => {
    try {
      const scriptPath = path.resolve(
        process.cwd(),
        "src/ai/ml/infer_runner.py"
      );

      const features: number[] = [
        input.baseConfidence,
        input.path === "DEEP" ? 1 : 0,
        input.path === "RESEARCH" ? 1 : 0,
        input.retryCount ?? 0,
      ];

      const py = spawn("python3", [
        scriptPath,
        JSON.stringify(features),
      ]);

      let output = "";

      py.stdout.on("data", (d) => {
        output += d.toString();
      });

      py.on("close", () => {
        try {
          const parsed = JSON.parse(output);
          if (typeof parsed?.risk !== "number") {
            resolve(null);
            return;
          }

          const risk = Math.max(0, Math.min(1, parsed.risk));

          resolve({
            risk,
            level:
              risk > 0.7
                ? "HIGH"
                : risk > 0.4
                ? "MEDIUM"
                : "LOW",
          });
        } catch {
          resolve(null);
        }
      });
    } catch {
      resolve(null);
    }
  });
}
