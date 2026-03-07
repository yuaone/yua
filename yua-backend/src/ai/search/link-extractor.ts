/* --------------------------------------------------
 * Link Extractor
 * - 입력 문자열에서 URL 추출
 * - markdown / plain text 지원
 * -------------------------------------------------- */

const URL_REGEX =
  /(https?:\/\/[^\s)]+)|(www\.[^\s)]+)/gi;

export function extractLinks(input: string): string[] {
  if (!input) return [];

  const matches = input.match(URL_REGEX) ?? [];
  const normalized = matches.map((m) =>
    m.startsWith("http") ? m : `https://${m}`
  );

  return Array.from(new Set(normalized));
}
