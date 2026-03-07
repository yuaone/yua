// src/ai/ml/train_job.ts
// 🔒 SSOT: Manual Training Job Trigger

import { spawn } from "child_process";
import path from "path";
import { activateModel } from "./model-registry";

const TRAIN_SCRIPT = path.resolve(__dirname, "train.py");
const MODEL_DIR = path.resolve(__dirname, "model");

export async function runManualTraining(): Promise<void> {
  console.info("[ML] Manual training started");

  await new Promise<void>((resolve, reject) => {
    const proc = spawn("python3", [TRAIN_SCRIPT], {
      stdio: "inherit",
    });

    proc.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Training failed (code=${code})`));
    });
  });

  // 최신 모델 선택 (v2 기준)
  const newModelPath = path.join(MODEL_DIR, "decision_risk_v2.pt");
  activateModel(newModelPath);

  console.info("[ML] Manual training completed & activated");
}
