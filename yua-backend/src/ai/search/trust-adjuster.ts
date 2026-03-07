// 📂 src/ai/search/trust-adjuster.ts

export function adjustTrustScore(
  url: string,
  baseScore: number
): number {
  let score = baseScore;

  try {
    const host = new URL(url).host;

    if (/openai\.com|anthropic\.com|ai\.google\.dev|learn\.microsoft\.com/i.test(host)) {
      score += 0.8;
    }

    if (/github\.com\/(openai|anthropic|google|microsoft)/i.test(url)) {
      score += 0.6;
    }

    if (/reddit\.com/i.test(host)) score -= 0.4;
    if (/medium\.com/i.test(host)) score -= 0.2;

  } catch {}

  return Math.max(0, Math.min(2, score));
}
