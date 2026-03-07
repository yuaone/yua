// 🔒 IMAGE OBSERVER — SSOT FINAL (PHASE 6-3)
// ----------------------------------------
// 책임:
// - 이미지 "관측" 결과를 구조화
// - 판단 / 추론 / 해결책 생성 ❌
// - Reasoning / Task / Verifier 로 넘길 신호만 생성
//
// 출력:
// - ImageObservation (deterministic, hint-based)
//
// 금지:
// - LLM ❌
// - async ❌
// - side effect ❌

/* -------------------------------------------------- */
/* Types                                              */
/* -------------------------------------------------- */

export type ImageHint =
  | "LIKELY_CODE"
  | "LIKELY_ERROR"
  | "LIKELY_UI"
  | "LIKELY_DIAGRAM"
  | "UNCLEAR_IMAGE"
  | "LOW_CONFIDENCE";

export interface ImageMetadata {
  width?: number;
  height?: number;
  mimeType?: string;
  sizeBytes?: number;
}

export interface ImageOCRResult {
  text: string;
  confidence?: number; // 0~1
}

export interface ImageObservationInput {
  metadata?: ImageMetadata;
  ocr?: ImageOCRResult;
}

export interface ImageObservation {
  hints: ImageHint[];
  hasCode: boolean;
  hasErrorLog: boolean;
  observationConfidence: number; // 0~1
}

/* -------------------------------------------------- */
/* Constants                                          */
/* -------------------------------------------------- */

const CODE_PATTERN =
  /(function\s+\w+|\bconst\b|\blet\b|\bclass\b|=>|\{[\s\S]*\})/i;

const STACKTRACE_PATTERN =
  /(at\s+\S+|\bstack\b|Exception|Traceback)/i;

const ERROR_PATTERN =
  /(error|오류|exception|failed|crash)/i;

const TERMINAL_PATTERN =
  /(\$ |\> |\bnode\b|\bnpm\b|\byarn\b|\bpnpm\b)/i;

/* -------------------------------------------------- */
/* Main Observer                                      */
/* -------------------------------------------------- */

export function observeImage(
  input: ImageObservationInput
): ImageObservation {
  const hints: ImageHint[] = [];

  const ocrText = input.ocr?.text?.trim() ?? "";
  const ocrConfidence = input.ocr?.confidence ?? 0;

  /* ---------------- OCR 기반 힌트 ---------------- */

  if (ocrText.length === 0) {
    hints.push("UNCLEAR_IMAGE");
  }

  if (CODE_PATTERN.test(ocrText)) {
    hints.push("LIKELY_CODE");
  }

  if (
    ERROR_PATTERN.test(ocrText) ||
    STACKTRACE_PATTERN.test(ocrText) ||
    TERMINAL_PATTERN.test(ocrText)
  ) {
    hints.push("LIKELY_ERROR");
  }

  /* ---------------- 품질 힌트 ---------------- */

  if (ocrConfidence > 0 && ocrConfidence < 0.45) {
    hints.push("LOW_CONFIDENCE");
  }

  /* ---------------- Flags ---------------- */

  const hasCode = hints.includes("LIKELY_CODE");
  const hasErrorLog = hints.includes("LIKELY_ERROR");

  /* ---------------- Confidence ---------------- */

  const observationConfidence = clamp01(
    0.4 +
      (ocrText.length > 20 ? 0.15 : 0) +
      (ocrConfidence >= 0.6 ? 0.2 : 0) -
      (hints.includes("LOW_CONFIDENCE") ? 0.2 : 0) -
      (hints.includes("UNCLEAR_IMAGE") ? 0.25 : 0)
  );

  return {
    hints,
    hasCode,
    hasErrorLog,
    observationConfidence,
  };
}

/* -------------------------------------------------- */
/* Utils                                              */
/* -------------------------------------------------- */

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}
