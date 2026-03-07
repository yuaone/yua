// 📂 src/ai/utils/utils-text.ts
// 🔥 YUA-AI UtilsText — FINAL (TS5 / Node20)

import { forceClean } from "./utils-cleaner";

/**
 * 공백/줄바꿈 정규화
 */
export function normalizeWhitespace(text: string): string {
  if (!text) return "";
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * 길이 제한 + 말줄임표 처리
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text) return "";
  if (maxLength <= 0) return "";
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "…";
}

/**
 * 문장 단위 대략 나누기 (., ?, ! 기준)
 */
export function splitSentences(text: string): string[] {
  const base = normalizeWhitespace(text);
  if (!base) return [];
  return base
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

/**
 * 프롬프트용 텍스트 정리 파이프라인
 */
export function preparePromptText(text: unknown, maxLength = 8000): string {
  const cleaned = forceClean(
    text == null ? "" : typeof text === "string" ? text : String(text)
  );
  const normalized = normalizeWhitespace(cleaned);
  return truncateText(normalized, maxLength);
}
