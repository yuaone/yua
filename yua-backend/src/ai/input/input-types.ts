export type InputSource =
  | "USER"
  | "SYSTEM"
  | "API"
  | "INTERNAL";

/**
 * 🔹 Path Hint (NOT a decision)
 * SSOT-1 전용
 */
export type PathHintType =
  | "FAST"
  | "NORMAL"
  | "DEEP"
  | "BENCH"
  | "SEARCH"
  | "RESEARCH";

/* --------------------------------------------------
 * 🔸 Attachment (NEW — SAFE EXTENSION)
 * -------------------------------------------------- */

/**
 * 외부 입력 첨부물
 * - 이미지, 파일 등
 * - 판단 로직 ❌ (Planner에서만 의미 해석)
 */
export interface InputAttachment {
  type: "IMAGE" | "FILE";
  uri: string;

  mimeType?: string;
  name?: string;
  sizeBytes?: number;
}

/**
 * 🔹 RawInput
 *
 * SSOT:
 * - 외부 입력의 최소 단위
 * - 판단 / 추론 정보 ❌
 */
export interface RawInput {
  /** 원문 텍스트 */
  content: string;

  /** 입력 출처 */
  source: InputSource;

  /** optional path hint (NOT decision) */
  pathHint?: PathHintType;

  /** 외부 correlation / trace */
  traceId?: string;

  /** 🔸 외부 첨부물 (이미지/파일) */
  attachments?: InputAttachment[];
}

/**
 * 🔹 NormalizedInput
 *
 * SSOT:
 * - 모든 엔진/판단/라우팅의 기준 입력
 * - RawInput을 정규화한 결과
 */
export interface NormalizedInput {
  /** 정제된 입력 텍스트 */
  content: string;

  /** 입력 출처 */
  source: InputSource;

  /** optional path hint (NOT decision) */
  pathHint?: PathHintType;

  /** 내부 trace id (항상 존재) */
  traceId: string;

  /** 수신 시각 */
  receivedAt: number;

  /** 🔸 정규화된 첨부물 */
  attachments?: InputAttachment[];

  /* --------------------------------------------------
   * 🔸 EXTENSION ZONE (SAFE)
   * - 판단 로직에서 optional 사용
   * - normalize 단계 또는 이후 채움
   * -------------------------------------------------- */

  /** Path Router 결과 (결정 아님, 힌트 아님 → 결과) */
  path?: PathHintType;

  /** 스케줄링/리소스 힌트 */
  priority?: "LOW" | "NORMAL" | "HIGH";

  /** GPU 요구 여부 (추정/힌트) */
  requiresGPU?: boolean;

  /** 기타 엔진 확장 메타 */
  meta?: Record<string, any>;
}
