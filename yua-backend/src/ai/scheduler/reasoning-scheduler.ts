// 🔥 Reasoning Scheduler — SSOT SAFE WRAPPER
// -----------------------------------------
// 책임:
// - PathRouter 결과를 기반으로
// - 정책 평가(evaluatePolicies)를 1회 수행
// - ChatEngine이 소비 가능한 ScheduleResult 반환
// -----------------------------------------

import {
  ReasoningLoadVector,
  ScheduleResult,
} from "./scheduler-types";
import { evaluatePolicies } from "./scheduler-policy";

export function scheduleReasoning(
  vector: ReasoningLoadVector
): ScheduleResult {
  const evaluated = evaluatePolicies(vector);

  return {
    finalPath: evaluated.path,
    requiresGPU: evaluated.requiresGPU,
    priority: evaluated.priority,
  };
}
