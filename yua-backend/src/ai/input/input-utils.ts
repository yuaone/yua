// 📂 src/ai/input/input-utils.ts

import { randomUUID } from "crypto";

export function generateTraceId(): string {
  return randomUUID();
}

export function sanitizeContent(input: string): string {
  // ❌ 의미 변경 금지
  // ⭕ 구조적 안전만 확보
  return input
    .replace(/\0/g, "")        // null byte 제거
    .replace(/\r\n/g, "\n")    // line ending 통일
    .trim();
}
