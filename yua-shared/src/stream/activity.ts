// yua-shared/src/stream/activity.ts
// 🔥 Activity Stream — SSOT FINAL
// - UI 타임라인 / 인라인 / 패널 1:1 매칭
// - Stream / Engine / Front 공통 계약

/* ----------------------------------
 * Source / Reference Chip
 * ---------------------------------- */

export type SourceChip = {
  id: string;           // stable key (ex: url, docId)
  label: string;        // host or short label
  url?: string | null;
  host?: string | null;
  preview?: string;
};

export type ActivitySectionKey =
  | "now"
  | "evidence"
  | "sources"
  | "next";

export type ActivitySection = {
  key: ActivitySectionKey;
  title: string;
  body?: string;
  chips?: SourceChip[];
};

/* ----------------------------------
 * Activity Semantic Kind (SSOT)
 * ---------------------------------- */
/**
 * ❗ "무엇을 하고 있는가"에 대한 의미
 * - UI 타임라인 / Drawer grouping 기준
 * - GPT activity 패널과 동일 개념
 */
export const ActivityKind = {
  // 🔹 Generic
  NOTE: "NOTE", // 설명 / 메모 / 보조 설명
  TOOL: "TOOL", // 일반 툴 실행

  // 🔹 Search / Research
  SEARCHING: "SEARCHING",
  RESEARCHING: "RESEARCHING",
  RANKING_RESULTS: "RANKING_RESULTS",

  // 🔹 Analysis / Reasoning (연출용, 사고 노출 ❌)
  ANALYZING_INPUT: "ANALYZING_INPUT",
  ANALYZING_IMAGE: "ANALYZING_IMAGE",
  PLANNING: "PLANNING",
  REASONING_SUMMARY: "REASONING_SUMMARY",
  // 🔹 Execution
  EXECUTING: "EXECUTING",
  VERIFYING: "VERIFYING",
  FINALIZING: "FINALIZING",

  // 🔹 Image / Media
  IMAGE_ANALYSIS: "IMAGE_ANALYSIS",
  IMAGE_GENERATION: "IMAGE_GENERATION",
  PREPARING_STUDIO: "PREPARING_STUDIO",

  // 🔹 Code Interpreter
  CODE_INTERPRETING: "CODE_INTERPRETING",

  // 🔹 Quant / Finance
  QUANT_ANALYSIS: "QUANT_ANALYSIS",
} as const;

export type ActivityKind =
  typeof ActivityKind[keyof typeof ActivityKind];

/* ----------------------------------
 * Activity Status
 * ---------------------------------- */
/**
 * ❗ 상태는 "결과" 표현용
 * - RUNNING: 점/펄스
 * - OK: 완료
 * - FAILED: 실패
 */
export type ActivityStatus =
  | "RUNNING"
  | "OK"
  | "FAILED";

/* ----------------------------------
 * Activity Operation
 * ---------------------------------- */
/**
 * ADD   : 새 activity 시작
 * PATCH : 내용/상태 갱신
 * END   : 명시적 종료 (status=OK/FAILED)
 */
export type ActivityOp =
  | "ADD"
  | "PATCH"
  | "END";

/* ----------------------------------
 * Activity Item (SSOT Core)
 * ---------------------------------- */

export type ActivityItem = {
  /** stable id (ex: search:<trace>:<seg>:<n>) */
  id: string;

  /** 🔥 semantic meaning */
  kind: ActivityKind;

  /** runtime status */
  status?: ActivityStatus;

  /** panel / timeline title */
  title?: string;

  /** detailed body (panel only) */
  body?: string;

  /** 🔥 inline one-liner (GPT inline thinking 대응) */
  inlineSummary?: string;

  /** 🔥 sectioned body (panel only) */
  sections?: ActivitySection[];

  /** reference chips (sources, docs, urls) */
  chips?: SourceChip[];

  /** timestamp (epoch ms) */
  at?: number;

  /** tool execution artifact (image panel, CSV preview, code output) */
  artifact?: {
    kind: "IMAGE_PANEL" | "CSV_PREVIEW" | "CODE_OUTPUT" | "CODE_ERROR";
    imageUrl?: string;
    caption?: string;
    csvPreview?: { headers: string[]; rows: string[][]; totalRows: number };
    code?: { language: string; source: string; output?: string };
    mimeType?: string;
  };

  /** extension-safe metadata */
  meta?: Record<string, unknown>;
};

/* ----------------------------------
 * Activity Stream Payload (SSOT)
 * ---------------------------------- */
/**
 * YuaStreamEvent.event === "activity" 일 때 사용
 * Stream / UI / Engine 공통 계약
 */
export type ActivityEventPayload = {
  op: ActivityOp;
  item: ActivityItem;
};
