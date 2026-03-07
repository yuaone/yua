// 🔒 YUA SSOT — Decision Context Types (v1)
// ----------------------------------------
// 단일 진실 원본 (Single Source of Truth)
// 이 객체 이후로 판단/추론/경로 재생성 금지

import type { PathType } from "../../routes/path-router";
import type { DecisionResult } from "../../types/decision";
import type { ReasoningResult } from "../reasoning/reasoning-engine";
import type { MemoryIntent } from "../memory/memory-intent";
import { detectMemoryIntent } from "../memory/memory-intent";
import type { ToolGateDecision } from "../tools/tool-types";
import type { PersonaContext } from "../persona/persona-context.types";
import type { ResponseHint } from "../chat/types/response.final";
import type { AttachmentMeta } from "../chat/types/attachment.types";
import type { TurnFlow } from "../chat/types/turn-flow";
import type { ChatMode } from "../chat/types/chat-mode";
import type { LeadHint } from "../chat/types/lead-hint";
import type { ExecutionPlan } from "../execution/execution-plan";
import type { ResponseAffordanceVector } from "./response-affordance";
import type { ConversationalOutcome } from "./conversational-outcome";
import type { ThinkingProfile } from "../../types/stream";
import type { ComputePolicy } from "../compute/compute-policy";
import type { YuaMaxHint } from "../flowguard/yua-max-v0";
import type { YuaMaxV1Hint } from "yua-shared/types/yuaMax";

export interface DecisionContext {
  allowContinuation: boolean;
  responseAffordance?: ResponseAffordanceVector;
  prevResponseAffordance?: ResponseAffordanceVector;
  /** LLM / Tool / Memory 에 전달될 최종 입력 */
  sanitizedMessage: string;
  language: "ko" | "en" | "unknown";
  computePolicy: ComputePolicy;
  /** 행동 경로 (FAST / NORMAL / DEEP / SEARCH / …) */
  path: PathType;
  verifierVerdict?: "PASS" | "WEAK" | "FAIL";
  failureSurface?: import("../selfcheck/failure-surface-engine").FailureSurface;
  
    prevTurnContinuity?: {
    anchorConfidence: number;
    continuityAllowed: boolean;
    contextCarryLevel: "RAW" | "SEMANTIC" | "ENTITY";
  };

  runtimeHints?: {
    depthOverride?: "deep";
    yuaMax?: YuaMaxHint;
    yuaMaxV1?: YuaMaxV1Hint;
    forceSearch?: boolean;
    intentHint?:
      | "summary_transform_request"
      | "prefer_question_turn";
    pathHint?:
      | "prefer_normal_without_explicit_search"
      | "prefer_search_with_explicit_search"
      | "prefer_normal_for_ready_ask";
  };

  /**
   * 🔒 SSOT: Search Facet Signal (READ ONLY)
   * - 판단/경로 변경 ❌
   * - 신호 전달 ONLY
   */
  searchFacetSignal?: {
    existence?: number;
    price?: number;
    performance?: number;
    risk?: number;
    policy?: number;
    timing?: number;
  };

  /** 판단 결과 (RULE / RULE+ML) */
  decision: DecisionResult;
  executionPlan?: ExecutionPlan;
  /** 추론 결과 (계산 전용, 서술 ❌) */
  reasoning: ReasoningResult;
  anchorConfidence: number;
  /** 메모리 의도 (commit 여부는 Controller에서 결정) */
  memoryIntent: MemoryIntent;
  conversationalOutcome: ConversationalOutcome;
  toneBias?: {
    profile:
      | "CASUAL"
      | "EXPERT"
      | "DESIGNER"
      | "EXECUTIVE"
      | "EDUCATOR";
    intensity?: "LOW" | "MEDIUM" | "HIGH";
    source: "PRIOR" | "CARRY" | "INFERRED";
    locked?: boolean;
  };

    timeAxis?: {
    relation: "PAST" | "TODAY" | "FUTURE" | "UNKNOWN";
    targetDate?: string;
    daysDiff?: number;
  };

   toneAllowed?: {
   personal: boolean;   // 캐주얼/이름/대화체 가능 여부
   source: "persona_permission";
 };

  /** Persona + Permission (Judgment 이후 확정) */
  personaContext: PersonaContext;
  mode: ChatMode;
  thinkingProfile: import("../../types/stream").ThinkingProfile;
  responseMode?: "ANSWER" | "CONTINUE" | "CLARIFY";
  attachments?: AttachmentMeta[];
    /** 🔥 SSOT: 입력 시그널 (파생 계산 ❌, 사실만 전달) */
  inputSignals?: {
    hasImage: boolean;
    hasText: boolean;
    isMultimodal?: boolean;
    hasQuestionSignal?: boolean;
  };
  fileSignals?: {
    hasFile: boolean;
    hasFileIntent: boolean;
    relevanceScore: number;
  };
  fileRagForceOnce?: boolean;
  fileRagConfidence?: number;
  fileRagConflict?: boolean;
    /**
   * 🔒 SSOT: Output structure / density hint ONLY
   * - 판단 / 상태 / 의미 해석 ❌
   * - PromptRuntime → PromptBuilder로 그대로 전달
   */
  responseHint?: ResponseHint;
  leadHint?: LeadHint;
   outputTransformHint?:
    | "DELTA_ONLY"
    | "ROTATE"
    | "SUMMARIZE"
    | "CONCLUDE"
    | "SOFT_EXPAND";
  /** Tool 사용 가능성 (optional) */
  toolGate?: ToolGateDecision;
  turnFlow?: "NEW" | "FOLLOW_UP" | "ACK_CONTINUE" | "TOPIC_SHIFT";
  turnIntent?:
    | "QUESTION"
    | "CONTINUATION"
    | "REACTION"
    | "AGREEMENT"
    | "SHIFT";


  /** 추적용 */
  traceId: string;
  userId?: number;
  threadId?: number;
  instanceId: string; 
  /**
   * 🔒 SSOT: Deterministic Reasoning Deltas
   * - LLM 이전에 완성
   * - append-only
   */
reasoningPanels?: {
  id: string;                // panel id (e.g. traceId:decision)
  source: "decision" | "tool_gate" | "prompt_runtime";
  title: string;             // 패널 제목
  index: number;             // 순서 고정
  status: "RUNNING" | "DONE";
  items: {
    id: string;
    title: string;
    body: string;
    ts: number;
  }[];
}[];
}
