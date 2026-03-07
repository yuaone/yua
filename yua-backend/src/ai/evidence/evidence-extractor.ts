// 🔥 EVIDENCE EXTRACTOR — SSOT FINAL (PHASE 3)
// -------------------------------------------
// 책임:
// - Raw 입력 → EvidenceSnapshot 생성
// - 패턴 기반 deterministic extractor
//
// 금지:
// - LLM ❌
// - async ❌
// - side effect ❌
//
// 사용처:
// - TaskResolver
// - ToolGate
// - Verification Engine

import {
  EvidenceItem,
  EvidenceKind,
  EvidenceResult,
  EvidenceSnapshot,
  EvidenceStrength,
} from "./evidence.types";

/* -------------------------------------------------- */
/* Input Type                                         */
/* -------------------------------------------------- */

export interface EvidenceExtractInput {
  /**
   * 사용자 입력 원문
   */
  text: string;

  /**
   * 이미지 OCR 결과 (있는 경우만)
   * - 이미지 분석 파이프라인에서 주입
   */
  screenshotText?: string;
}

/* -------------------------------------------------- */
/* Main Extractor                                     */
/* -------------------------------------------------- */

export function extractEvidence(
  input: EvidenceExtractInput
): EvidenceResult {
  const items: EvidenceItem[] = [];

  const text = input.text ?? "";
  const lower = text.toLowerCase();

  /* ---------------- IMAGE ---------------- */

  if (input.screenshotText && input.screenshotText.trim().length > 0) {
    items.push({
      kind: "IMAGE_INPUT",
      strength: "STRONG",
    });

    items.push({
      kind: "SCREENSHOT_TEXT",
      value: input.screenshotText.slice(0, 500),
      strength: "MEDIUM",
    });
  }

  /* ---------------- CODE ---------------- */

  if (hasCodeBlock(text)) {
    items.push({
      kind: "CODE_SNIPPET",
      strength: "STRONG",
    });
  }

  if (hasDiffBlock(text)) {
    items.push({
      kind: "DIFF_BLOCK",
      strength: "STRONG",
    });
  }

  /* ---------------- ERROR ---------------- */

  if (hasTypeError(text)) {
    items.push({
      kind: "TYPE_ERROR",
      strength: "STRONG",
    });
  }

  if (hasRuntimeError(text)) {
    items.push({
      kind: "RUNTIME_ERROR",
      strength: "STRONG",
    });
  }

  if (hasStackTrace(text)) {
    items.push({
      kind: "STACK_TRACE",
      strength: "MEDIUM",
    });
  }

  if (hasGenericError(lower)) {
    items.push({
      kind: "ERROR_LOG",
      strength: "MEDIUM",
    });
  }

  /* ---------------- URL / PATH / COMMAND ---------------- */

  const urls = extractUrls(text);
  for (const url of urls) {
    items.push({
      kind: "URL_REFERENCE",
      value: url,
      strength: "MEDIUM",
    });
  }

  const paths = extractFilePaths(text);
  for (const p of paths) {
    items.push({
      kind: "FILE_PATH",
      value: p,
      strength: "MEDIUM",
    });
  }

  if (hasCommand(text)) {
    items.push({
      kind: "COMMAND",
      strength: "WEAK",
    });
  }

  /* -------------------------------------------------- */
  /* Snapshot                                          */
  /* -------------------------------------------------- */

  const snapshot: EvidenceSnapshot = {
    items,
    flags: {
      hasImage: items.some(i => i.kind === "IMAGE_INPUT"),
      hasCode: items.some(i =>
        i.kind === "CODE_SNIPPET" || i.kind === "DIFF_BLOCK"
      ),
      hasError: items.some(i =>
        i.kind === "ERROR_LOG" ||
        i.kind === "TYPE_ERROR" ||
        i.kind === "RUNTIME_ERROR"
      ),
      hasTypeError: items.some(i => i.kind === "TYPE_ERROR"),
      hasRuntimeError: items.some(i => i.kind === "RUNTIME_ERROR"),
      hasDiff: items.some(i => i.kind === "DIFF_BLOCK"),
    },
  };

  /* -------------------------------------------------- */
  /* Stats                                             */
  /* -------------------------------------------------- */

  const stats = {
    total: items.length,
    strong: items.filter(i => i.strength === "STRONG").length,
    medium: items.filter(i => i.strength === "MEDIUM").length,
    weak: items.filter(i => i.strength === "WEAK").length,
  };

  return { snapshot, stats };
}

/* ================================================== */
/* Pattern Utils                                      */
/* ================================================== */

function hasCodeBlock(text: string): boolean {
  return /```[\s\S]*?```/.test(text);
}

function hasDiffBlock(text: string): boolean {
  return /^\s*(\+|\-){1}/m.test(text) && /diff\s--git/i.test(text);
}

function hasTypeError(text: string): boolean {
  return /(typeerror|ts\d{3,5}|cannot assign|is not assignable)/i.test(text);
}

function hasRuntimeError(text: string): boolean {
  return /(runtime error|exception|crash|segmentation fault)/i.test(text);
}

function hasStackTrace(text: string): boolean {
  return /(at\s.+\(.+:\d+:\d+\))/i.test(text);
}

function hasGenericError(text: string): boolean {
  return /(error|failed|failure|panic)/i.test(text);
}

function extractUrls(text: string): string[] {
  const matches = text.match(/https?:\/\/[^\s]+/gi);
  return matches ? Array.from(new Set(matches)) : [];
}

function extractFilePaths(text: string): string[] {
  const matches = text.match(
    /(\/[a-zA-Z0-9._-]+)+(\.[a-zA-Z0-9]+)?/g
  );
  return matches ? Array.from(new Set(matches)) : [];
}

function hasCommand(text: string): boolean {
  return /^\s*(npm|yarn|pnpm|npx|docker|kubectl|git)\s+/m.test(text);
}
