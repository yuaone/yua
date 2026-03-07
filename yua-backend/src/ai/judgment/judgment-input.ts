// 📂 src/ai/judgment/judgment-input.ts
// 🔒 Judgment Input Contract — SSOT FINAL (PHASE 9 READY)

import type { PathType } from "../../routes/path-router";
import type { CodeASTFeatures } from "../capability/code/code-ast-types";
import type { MathGraphFeatures } from "../capability/math/math-graph-types";

/* --------------------------------------------------
 * 🔒 Core Judgment Input (UNCHANGED)
 * -------------------------------------------------- */

export interface JudgmentInput {
  /** SSOT-2 Path Router 결과 */
  path: PathType;

  /** Capability Layer (선택적) */
  code?: CodeASTFeatures;
  math?: MathGraphFeatures;

  /** Scheduler 결과 (선택적) */
  priority?: "LOW" | "NORMAL" | "HIGH";
  requiresGPU?: boolean;

  /** Context */
  persona: {
    role: string;
  };

  /** Trace */
  traceId: string;

  /** 원본 입력 (판단용, 출력 금지) */
  rawInput: string;

  /* --------------------------------------------------
   * 🔥 PHASE 9 EXTENSION (OPTIONAL, NON-BREAKING)
   * -------------------------------------------------- */

  /**
   * Passive Memory Candidate
   * - NORMAL 대화에서 생성
   * - commit ❌
   * - judgment 참고용
   */
  memoryCandidate?: MemoryCandidate;
}

/* --------------------------------------------------
 * 🔹 Memory Candidate Type
 * -------------------------------------------------- */

export interface MemoryCandidate {
  content: string;
  scope: "general_knowledge" | "user_profile" | "project" | "context";
  confidence: number; // 0~1
  reason: string;
  source: "passive" | "explicit";
}
