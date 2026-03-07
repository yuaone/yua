// src/ai/ml/schedule-policy.ts
// 🔒 SSOT: Training Schedule Policy

import { runManualTraining } from "./train_job";

let lastTrainedAt = 0;
let failureCount = 0;

const DAY_MS = 24 * 60 * 60 * 1000;
const FAILURE_THRESHOLD = 5;

/**
 * 🔒 Rule 실패 기록 (외부에서 호출)
 */
export function recordJudgmentFailure(): void {
  failureCount += 1;
}

/**
 * 🔒 주기적 호출 (예: cron / 서버 tick)
 */
export async function evaluateTrainingPolicy(): Promise<void> {
  const now = Date.now();

  // 1️⃣ 하루 1회 상한
  if (now - lastTrainedAt < DAY_MS && failureCount < FAILURE_THRESHOLD) {
    return;
  }

  // 2️⃣ 실패 n회 트리거
  if (failureCount >= FAILURE_THRESHOLD || now - lastTrainedAt >= DAY_MS) {
    console.info("[ML] Training policy triggered");

    try {
      await runManualTraining();
      lastTrainedAt = Date.now();
      failureCount = 0;
    } catch (err) {
      console.error("[ML] Training failed:", err);
      // 🔒 실패해도 서비스 영향 없음 (SSOT)
    }
  }
}
