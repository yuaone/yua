// 📂 src/ai/utils/utils-cleaner.ts
// 🔥 YUA-AI UtilsCleaner — FINAL (TS5 / Node20)

export function forceClean(text: string): string {
  if (text == null) return "";

  let result = String(text);

  // 1) undefined / null 완전 제거 (단독, 붙은 것 모두)
  result = result
    .replace(/\bundefined\b/gi, "")
    .replace(/\bnull\b/gi, "")
    .replace(/undefined/gi, "")
    .replace(/null/gi, "");

  // 2) 변형 방지 (undef1ned / und3fined / nul1 등)
  result = result
    .replace(/undef[\w]?ined/gi, "")
    .replace(/nul[\w]?/gi, "");

  // 3) 제어 문자 제거 (탭 제외)
  result = result.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, "");

  // 4) 공백 정리 (2칸 이상 → 1칸)
  result = result.replace(/\s{2,}/g, " ");

  // 5) 줄바꿈 앞뒤 공백 / undefined 잔여 제거
  result = result
    .split("\n")
    .map((line) =>
      line
        .replace(/\bundefined\b/gi, "")
        .replace(/\bnull\b/gi, "")
        .replace(/\s{2,}/g, " ")
        .trim()
    )
    .filter((line) => line.length > 0)
    .join("\n");

  return result.trim();
}

/**
 * 로그/스토리지용 안전 문자열
 */
export function cleanForLog(text: unknown, maxLength = 4000): string {
  const base = forceClean(text == null ? "" : String(text));

  if (maxLength > 0 && base.length > maxLength) {
    return base.slice(0, maxLength) + "…(truncated)";
  }

  return base;
}

/**
 * 프롬프트로 들어가기 전에 짧게 한번 정리
 */
export function cleanForPrompt(text: unknown, maxLength = 8000): string {
  const base = forceClean(text == null ? "" : String(text));

  if (maxLength > 0 && base.length > maxLength) {
    return base.slice(0, maxLength);
  }

  return base;
}
