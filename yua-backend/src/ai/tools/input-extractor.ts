// 🔒 Market Input Extractor (SSOT - HINT ONLY)
// - 절대 판단 ❌
// - 절대 확정 ❌
// - "사용자 힌트"만 구조화

export type DateHint =
  | { raw: string; kind: "exact" }
  | { raw: string; kind: "range" }
  | { raw: string; kind: "year" };

export interface MarketInput {
  symbolHints?: string[];
  dateHint?: DateHint;
}

export function extractMarketInput(
  message: string
): MarketInput | null {
  const normalized = message.replace(/\s+/g, "");
  const input: MarketInput = {};
  const symbolHints: string[] = [];

  /* ----------------------------- */
  /* 📅 날짜 힌트                  */
  /* ----------------------------- */

   let hasExact = false;
   let hasRange = false;

  // YYYY년 M월 D일 → exact
  const exactDate = normalized.match(
    /(\d{4})년(\d{1,2})월(\d{1,2})일/
  );
  if (exactDate) {
    const [, y, m, d] = exactDate;
    input.dateHint = {
      raw: `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`,
      kind: "exact",
    };
    hasExact = true;
    hasRange = true;
  }

  // YYYY년 M월 → range
  const monthRange = normalized.match(
    /(\d{4})년(\d{1,2})월/
  );
  if (!hasExact && monthRange) {
    const [, y, m] = monthRange;
    input.dateHint = {
      raw: `${y}-${m.padStart(2, "0")}`,
      kind: "range",
    };
    hasRange = true;
  }

  // YYYY년 → year
 const yearMatch =
   /(주가|가격|시가|종가|매출|실적|통계|시장)/.test(message)
     ? normalized.match(/(\d{4})년/)
     : null;
  if (!hasExact && !hasRange && yearMatch) {
    const [, y] = yearMatch;
    input.dateHint = {
      raw: y,
      kind: "year",
    };
  }

  /* ----------------------------- */
  /* 📈 종목 힌트                  */
  /* ----------------------------- */

  // 한국 종목 코드 (6자리)
  const codeMatch = normalized.match(/\b\d{6}\b/);
  if (codeMatch) {
    symbolHints.push(codeMatch[0]);
  }

  // 영문 티커
  const tickerMatch = normalized.match(/\b[A-Z]{1,5}\b/);
  if (tickerMatch) {
    symbolHints.push(tickerMatch[0]);
  }

  // 회사명 힌트 (한글 / 영문 혼합)
  // 🇰🇷 한국 회사명 (한글만)
  // 🔒 SSOT: 한글 회사명은 "시장 맥락"이 있을 때만 허용
  const hasMarketContext =
    /(주가|시세|종가|거래량|시장|stock|price|market)/i.test(message);

  if (hasMarketContext) {
    const krMatches = message.match(/[가-힣]{2,}/g);
    if (krMatches) {
      krMatches.forEach((name) => symbolHints.push(name));
    }
  }

  // 🇺🇸 미국 티커 (AAPL, NVDA)
  const usTickerMatches = message.match(/\b[A-Z]{1,5}\b/g);
  if (usTickerMatches) {
    usTickerMatches.forEach((t) => symbolHints.push(t));
  }

  if (symbolHints.length > 0) {
    input.symbolHints = Array.from(new Set(symbolHints));
  }

  return Object.keys(input).length > 0 ? input : null;
}
