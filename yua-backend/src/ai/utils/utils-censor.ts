// 📂 src/ai/utils/utils-censor.ts
// 🔥 YUA-AI UtilsCensor — FINAL (TS5 / Node20)

/**
 * 이메일 마스킹
 * test@example.com → t***@example.com
 */
export function maskEmail(input: string): string {
  if (!input) return "";

  return input.replace(
    /([a-zA-Z0-9._%+-])([a-zA-Z0-9._%+-]*)(@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
    (_match, first, middle, domain) => {
      const stars = middle.length > 0 ? "***" : "**";
      return `${first}${stars}${domain}`;
    }
  );
}

/**
 * 전화번호/휴대폰번호 마스킹
 * 010-1234-5678 → 010-****-5678
 */
export function maskPhone(input: string): string {
  if (!input) return "";

  return input.replace(
    /(\d{2,3})[-\s]?(\d{3,4})[-\s]?(\d{4})/g,
    (_match, a, _b, c) => `${a}-****-${c}`
  );
}

/**
 * API Key / Secret 패턴 마스킹
 * sk-xxxx → sk-****…
 */
export function maskApiKeyLike(input: string): string {
  if (!input) return "";

  return input.replace(
    /\b(sk|rk|pk)_[a-zA-Z0-9]{8,}/g,
    (match) => match.slice(0, 5) + "****MASKED****"
  );
}

/**
 * 민감정보 전체 마스킹 파이프라인
 */
export function censorSensitive(text: string): string {
  if (!text) return "";

  let result = text;
  result = maskEmail(result);
  result = maskPhone(result);
  result = maskApiKeyLike(result);

  return result;
}
