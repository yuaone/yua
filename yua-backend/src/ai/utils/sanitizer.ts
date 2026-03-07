// 📂 src/ai/utils/sanitizer.ts
// 🟣 YUA-AI Sanitizer — FINAL ENTERPRISE VERSION (2025.11)
// ------------------------------------------------------------------------------------------
// ✔ PDF Engine · PromptBuilder · ReportEngine · Workflow 전부 공통 사용
// ✔ undefined/null 제거
// ✔ HTML 태그, 스크립트 제거
// ✔ 제어문자 제거
// ✔ 줄바꿈 정리
// ✔ base64 이미지도 안전하게 통과
// ✔ strict-ts 100%
// ------------------------------------------------------------------------------------------

/**
 * HTML 태그 제거
 */
function stripHtml(input: string): string {
  return input.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
              .replace(/<\/?[^>]+(>|$)/g, "");
}

/**
 * 제어 문자 제거 (PDF 깨짐 방지)
 */
function removeControlChars(input: string): string {
  return input.replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F]/g, "");
}

/**
 * base64 여부 체크
 */
function isBase64(str: string): boolean {
  return /^data:image\/(png|jpg|jpeg|webp);base64,/i.test(str);
}

/**
 * 공백/줄바꿈 정리
 */
function normalizeWhitespace(input: string): string {
  return input
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    // ⚠️ LaTeX 보호: 공백 축약 제거
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * 최종 전체 Sanitizer
 */
export function sanitizeContent(raw: unknown): string {

  if (raw == null) return "";

  // 문자열 강제 변환
  let text = String(raw);

   // 🔒 LaTeX 포함 시 sanitize 최소화
 if (/\\(frac|sum|int|oint|sqrt|left|right|operatorname)/.test(text)) {
   return text.normalize("NFKC");
 }

  // base64 이미지라면 건드리지 않고 그대로 반환
  if (isBase64(text)) return text;

  // undefined/null 텍스트 제거
  text = text.replace(/\bundefined\b/gi, "")
             .replace(/\bnull\b/gi, "")
             .replace(/undefined/gi, "")
             .replace(/null/gi, "");

  // HTML 태그 제거
  text = stripHtml(text);

  // 제어문자 제거
  text = removeControlChars(text);

  // 이모지·유니코드 폭넓게 허용 (PDF 깨짐 방지)
  text = text.normalize("NFKC");

  // 공백 정리
  text = normalizeWhitespace(text);

  return text;
}

/**
 * 로그용 버전 (길이 제한)
 */
export function sanitizeForLog(input: unknown, max = 3000): string {
  const clean = sanitizeContent(input);
  return clean.length > max ? clean.slice(0, max) + "…(truncated)" : clean;
}

/**
 * PDF 엔진 전용 버전
 */
export function sanitizeForPDF(input: unknown): string {
  let clean = sanitizeContent(input);

  // PDF에서 깨지는 문자 추가 제거
  clean = clean.replace(/[^\S\r\n]+/g, " ");  // 비정규 공백 제거

  return clean;
}
