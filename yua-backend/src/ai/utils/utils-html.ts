// 📂 src/ai/utils/utils-html.ts
// 🔥 YUA-AI UtilsHtml — FINAL (TS5 / Node20)

/**
 * HTML 이스케이프 (XSS 최소 방어용)
 */
export function escapeHtml(input: string): string {
  if (!input) return "";
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * 태그 제거 (순수 텍스트용)
 */
export function stripHtmlTags(input: string): string {
  if (!input) return "";
  return input.replace(/<[^>]*>/g, "");
}

/**
 * HTML → 텍스트 → 길이 제한
 */
export function htmlToPreviewText(input: string, maxLength = 200): string {
  const plain = stripHtmlTags(input).trim();

  if (maxLength > 0 && plain.length > maxLength) {
    return plain.slice(0, maxLength) + "…";
  }

  return plain;
}
