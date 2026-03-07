import type { PathType } from "../../routes/path-router";
import type { DecisionDomain } from "../decision-assistant/decision-domain";

export type ToolLevel = "NONE" | "LIMITED" | "FULL" | "SEARCH_MINIMUM";

/**
 * 🔒 ToolType = 실행 방식 ONLY
 * - 문제 영역은 domain으로 전달
 */
export type ToolType =
  | "PY_SOLVER"
  | "MARKET_DATA"
  | "WEB_FETCH"
  | "OPENAI_WEB_SEARCH"
  | "OPENAI_WEB_FETCH"
  | "OPENAI_CODE_INTERPRETER"
  | "DOCUMENT_BUILDER"
  | "DOCUMENT_REWRITE"
  | "CODE_SANDBOX";

  export type MarketDataStatus =
  | "OK"
  | "DELAYED"
  | "FUTURE"
  | "NO_DATA"
  | "ERROR";



export interface ToolGateSignals {
  traceId?: string; 
  domain: DecisionDomain;
  path: PathType;
  executionTask?: string;
  baseConfidence: number; // 0~1
  hasSearchIntent?: boolean;
  risk: number;           // 0~1
  hasEventPattern?: boolean;
  /** 🔒 판단 보조 신호 (판단 아님) */
  hasMathExpression?: boolean;
  hasScientificPattern?: boolean;
  hasMarketIntent?: boolean;
  hasSensitiveKeyword: boolean;
  hasCodeBlock: boolean;
  hasUrl: boolean;

    // 🔥 SSOT: Time Axis (Decision-resolved fact)
  timeAxis?: {
    relation: "PAST" | "TODAY" | "FUTURE" | "UNKNOWN";
    targetDate?: string;
    daysDiff?: number;
  };

  /** PHASE 8-5 runtime score */
  toolScore?: number;
}

export type ToolGateDecision = {
  toolLevel: ToolLevel;
  allowedTools: ToolType[];
  executionTask?: string;

  verifierBudget: number;
  toolScore: number;

  reason: string;
  /**
   * 🔥 Vision Budget (SSOT)
   * - OCR / Crop / Zoom 허용 범위
   * - ExecutionEntry → VisionOrchestrator 전달 전용
   */
  visionBudget?: {
    allowOCR?: boolean;
    allowZoom?: boolean;
    allowCrop?: boolean;
    maxImages?: number;
  };
};
