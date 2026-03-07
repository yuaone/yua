// 🔒 EXECUTION RESULT — SSOT FINAL
// Execution 결과 전용 타입 (Plan과 분리)

import type { ExecutionPlan } from "./execution-plan";

export type ExecutionResult =
  | {
      ok: true;
      plan: ExecutionPlan;
      output: unknown;
      sectionId?: number;
      visionConfidence?: number; // 🔥 ADD
      /**
       * 🔒 SSOT: Evidence Signals (READ-ONLY)
       * - Search / Research 결과 요약 신호
       * - Decision / Reasoning / confidence 변경 ❌
       * - PromptBuilder에서 tone 힌트로만 사용
       */
      evidenceSignals?: {
        source: "search" | "research";
        attempted: boolean;
        documentCount: number;
        trustedCount: number;
        avgTrustScore: number;
      }[];
    }
  | {
      ok: false;
      plan: ExecutionPlan;
      error: {
        code: string;
        message: string;
      };
    };
