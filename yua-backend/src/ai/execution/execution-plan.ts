// 🔒 EXECUTION PLAN — SSOT FINAL (PHASE 6-1)
// ----------------------------------------
// 책임:
// - Dispatcher 결과를 "실행 가능 단위"로 정규화
// - LLM / Tool / Prompt Runtime 이 소비하는 유일한 포맷
//
// 금지:
// - 추론 ❌
// - 실행 ❌
// - 판단 ❌

import type { TaskKind } from "../task/task-kind";

/* -------------------------------------------------- */
/* Execution Plan Types                                */
/* -------------------------------------------------- */

export type ExecutionPlan =
  | ImageAnalysisPlan
  | ImageGenerationPlan
  | CodeVerificationPlan
  | CodeGenerationPlan
  | DirectChatPlan
  | SearchPlan
  | SearchVerifyPlan
  | FileIntelligencePlan
  | ToolExecutionPlan
  | DirectUrlFetchPlan; // 🔥 추가


export interface BasePlan {
  task: TaskKind;
  confidence?: number;


  /**
   * 🔒 qualityHints (READ-ONLY)
   * - failure-aware 사고 힌트
   * - 실행 / 판단 / 출력에 영향 ❌
   */
  qualityHints?: {
    primaryRisk:
      | "STATE_CORRUPTION"
      | "TYPE_SAFETY"
      | "ASYNC_RACE"
      | "API_MISUSE"
      | "EXTENSION_PAIN";
    reasoningNote: string;
  };
  }

/* ---------------- IMAGE ---------------------------- */

export interface ImageAnalysisPlan extends BasePlan {
  task: "IMAGE_ANALYSIS";
  payload: {
    observation: unknown;
    nextAction?: "OBSERVE_ONLY" | "GENERATE_ASSET";
    uxHint?: "ANALYZING_IMAGE";
  };
}

export interface ImageGenerationPlan extends BasePlan {
  task: "IMAGE_GENERATION";
  payload: {
    message: string;
  };
}

/* ---------------- CODE VERIFY ---------------------- */

export interface CodeVerificationPlan extends BasePlan {
  task:
    | "CODE_REVIEW"
    | "TYPE_ERROR_FIX"
    | "RUNTIME_ERROR_FIX";
  payload: {
    verifiedContext: unknown;
    /**
     * verifier 실패/컨텍스트 부족 시 down-stream에 상태로 전달
     * (Dispatcher에서 throw 금지 SSOT 유지)
     */
    status?: "NEEDS_MORE_CONTEXT";
    /**
     * verifier 실패 상세 (rules output 등)
     * Prompt/Executor가 사용자에게 요청할 추가정보를 결정할 때 사용
     */
    verification?: unknown;
  };
}

/* ---------------- CODE GENERATION ------------------ */

export interface CodeGenerationPlan extends BasePlan {
  task: "CODE_GENERATION" | "REFACTOR";
  payload: {
    codeContext: unknown;
    status?: "READY_FOR_GENERATION" | "NEEDS_MORE_CONTEXT";
  };
}

/* ---------------- CHAT ----------------------------- */

export interface DirectChatPlan extends BasePlan {
  task: "DIRECT_CHAT";
  payload: {
    message: string;
  };
}

/* ---------------- SEARCH --------------------------- */

export interface SearchPlan extends BasePlan {
  task: "SEARCH";
  payload: {
    message: string;
    trigger?:
      | "EXPLICIT"
      | "VERIFY"
      | "AUTO_LOW_CONF"
      | "AUTO_DEEP_RISK"
     | "AUTO_DOCS"
    | "AUTO_REPO"
      | "AUTO_FRESH_FACT";
    score?: number;
    planningNote?: string; // 🔥 Deep reasoning용 (실행 영향 ❌)
  };
}

export interface SearchVerifyPlan extends BasePlan {
  task: "SEARCH_VERIFY";
  payload: {
    message: string;
  };
}
/* ---------------- DIRECT URL FETCH ---------------- */

export interface DirectUrlFetchPlan extends BasePlan {
  task: "DIRECT_URL_FETCH";
  payload: {
    url: string;
  };
}
/* ---------------- FILE INTELLIGENCE ---------------- */

export interface FileIntelligencePlan extends BasePlan {
  task: "FILE_INTELLIGENCE";
  payload: {
    message: string;
    attachments?: unknown;
  };
}
/* ---------------- TOOL ----------------------------- */

export interface ToolExecutionPlan extends BasePlan {
  task:
    | "FILE_ANALYSIS"
    | "TABLE_EXTRACTION"
    | "DATA_TRANSFORM";
  payload: unknown;
}
