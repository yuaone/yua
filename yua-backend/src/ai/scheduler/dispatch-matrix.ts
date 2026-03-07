// 📂 src/ai/scheduler/dispatch-matrix.ts
// 🔥 Execution Dispatch Matrix — SSOT
// -----------------------------------------
// 책임:
// - Scheduler 결과를 실행 리소스로 매핑
// - 판단 ❌ / 추론 ❌ / 증폭 ❌
// - 순수 매핑 테이블
// -----------------------------------------

import { ScheduleResult } from "./scheduler-types";

export type ExecutionTarget =
  | "CPU_SYNC"
  | "CPU_ASYNC"
  | "GPU"
  | "BENCH_BATCH";

export interface DispatchResult {
  target: ExecutionTarget;
  queue: "FAST" | "NORMAL" | "DEEP" | "BENCH";
  priority: "LOW" | "NORMAL" | "HIGH";
}

export function dispatchBySchedule(
  schedule: ScheduleResult
): DispatchResult {
  const { finalPath, requiresGPU, priority } = schedule;

  // 🔒 SSOT: path → queue 1:1
  const queue = finalPath;

  // ----------------------------------
  // 🔥 Execution Target Resolution
  // ----------------------------------

  // BENCH는 항상 배치 / 오프라인
  if (finalPath === "BENCH") {
    return {
      target: "BENCH_BATCH",
      queue: "BENCH",
      priority,
    };
  }

  // GPU는 DEEP에서만 허용
  if (requiresGPU && finalPath === "DEEP") {
    return {
      target: "GPU",
      queue: "DEEP",
      priority,
    };
  }

  // FAST는 무조건 동기 CPU
  if (finalPath === "FAST") {
    return {
      target: "CPU_SYNC",
      queue: "FAST",
      priority,
    };
  }

  // NORMAL / DEEP fallback → async CPU
  return {
    target: "CPU_ASYNC",
    queue: finalPath === "DEEP" ? "DEEP" : "NORMAL",
    priority,
  };
}
