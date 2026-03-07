// src/ai/judgment/judgment-phase2-bootstrap.ts

import { JudgmentFailureStore } from "./judgment-failure-store";
import { JudgmentLearningEngine } from "./judgment-learning-engine";
import { JudgmentRegistry } from "./judgment-registry";

// 기존 인스턴스 유지
export const judgmentFailureStore = new JudgmentFailureStore();

// 🔥 Registry는 독립 인스턴스로 유지
export const judgmentRegistry = new JudgmentRegistry();

// ✅ FIX: JudgmentLearningEngine은 1개 인자만 받음
export const judgmentLearningEngine = new JudgmentLearningEngine(
  judgmentFailureStore
);
