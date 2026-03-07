// 📂 src/ai/search/allowed-search-engine.ts
// 🔥 YUA Allowed Search Engine — SSOT v3 (Trust Scoring)
// -----------------------------------------------------
// ✔ Rule-based trust scoring (ML ❌)
// ✔ Official domain / docs boost
// ✔ Blog/cafe/commercial penalty
// ✔ License hint boost (best-effort)
// ✔ Prompt-safe SearchResult only

import type { ReasoningResult } from "../reasoning/reasoning-engine";

export type GlobalDomain =
  | "dev"
  | "data"
  | "infra"
  | "security"
  | "biz"
  | "law"
  | "finance"
  | "product"
  | "etc";

export type SearchResult = {
  title: string;
  snippet: string;
  source: string; // URL
  trust: number;  // 0..5
  relevance?: number; // 0..1 query-document match score
};

type SourceRegistryItem = {
  domain: GlobalDomain;
  url: string;          // base URL or exact domain
  trust: number;        // baseline 0..5
  tags?: ("official" | "docs" | "spec" | "gov" | "edu" | "org")[];
};

/**
 * ✅ SSOT: Registry is "boost list" not allowlist.
 * - registry hit => trust floor up
 * - no hit => still allowed, but trust computed by heuristics
 */
const SOURCE_REGISTRY: SourceRegistryItem[] = [
  { domain: "dev", url: "https://developer.mozilla.org", trust: 5, tags: ["official", "docs"] },
  { domain: "dev", url: "https://tc39.es", trust: 5, tags: ["official", "spec"] },
  { domain: "infra", url: "https://kubernetes.io/docs", trust: 5, tags: ["official", "docs"] },
  { domain: "security", url: "https://owasp.org", trust: 5, tags: ["org", "docs"] },
  { domain: "law", url: "https://www.law.cornell.edu", trust: 5, tags: ["edu", "docs"] },
];

type TrustSignals = {
  officialBoost: number;  // +0..+?
  penalty: number;        // -0..-?
  licenseBoost: number;   // +0..+?
  registryFloor: number;  // 0..5
};

function safeParseUrl(u: string): URL | null {
  try {
    return new URL(u);
  } catch {
    return null;
  }
}

function hostOf(url: string): string {
  const u = safeParseUrl(url);
  return u?.host?.toLowerCase() ?? "";
}

function pathOf(url: string): string {
  const u = safeParseUrl(url);
  return u?.pathname?.toLowerCase() ?? "";
}

function isGovEdu(host: string): boolean {
  return host.endsWith(".gov") || host.endsWith(".edu");
}

function looksOfficialDocs(host: string, path: string): boolean {
  // docs/spec/reference patterns
  if (/(docs|documentation|reference|spec|rfc|standards)/i.test(path)) return true;

  // common official doc hosts
  if (
    host.includes("developer.") ||
    host.includes("docs.") ||
    host.includes("api.") ||
    host.includes("learn.")
  ) {
    return true;
  }
  return false;
}

function isBlogOrCafe(host: string, path: string): boolean {
  // KR cafe/blog patterns + global blog hosts
  if (/(tistory\.com|blog\.naver\.com|post\.naver\.com|velog\.io|medium\.com|substack\.com)/i.test(host)) {
    return true;
  }
  if (/(cafe\.naver\.com|daum\.net\/cafe|cafe24)/i.test(host + path)) {
    return true;
  }
  if (/(blog|stories|newsletter)/i.test(host + path)) return true;
  return false;
}

function isCommercialSeo(host: string, path: string): boolean {
  // shopping/ads/affiliate style
  if (/(shop|store|buy|pricing|coupon|deal|ads|affiliate|utm_)/i.test(host + path)) return true;
  if (/(amazon\.|aliexpress\.|coupang\.|11st\.|gmarket\.|auction\.|smartstore\.naver\.com)/i.test(host)) {
    return true;
  }
  return false;
}

function isLoginWall(host: string, path: string): boolean {
  return /(login|signin|account|session|auth)/i.test(path) || /(accounts\.)/i.test(host);
}

/**
 * Best-effort license hint detection.
 * - Without fetching actual pages, we use URL patterns + snippet heuristics.
 * - This is "bonus", never the sole criterion.
 */
function detectLicenseHint(url: string, title: string, snippet: string): number {
  const text = `${url} ${title} ${snippet}`.toLowerCase();

  // explicit OSS licenses
  if (/(mit|apache-2\.0|apache license|bsd|mpl-2\.0|gpl|lgpl)/i.test(text)) return 0.8;

  // creative commons / public domain
  if (/(creative commons|cc-by|cc0|public domain)/i.test(text)) return 0.7;

  // docs licenses often
  if (/(license|licence|open source|oss)/i.test(text)) return 0.4;

  // github repo often indicates open license (not guaranteed)
  if (text.includes("github.com")) return 0.3;

  return 0;
}

function registryFloorFor(domain: GlobalDomain, url: string): number {
  const h = hostOf(url);
  const p = pathOf(url);

  let floor = 0;
  for (const s of SOURCE_REGISTRY) {
    if (s.domain !== domain) continue;

    const ru = safeParseUrl(s.url);
    if (!ru) continue;

    const rh = ru.host.toLowerCase();
    const rp = ru.pathname.toLowerCase();

    const hostMatch = h === rh || h.endsWith("." + rh);
    const pathMatch = rp === "/" ? true : p.startsWith(rp);

    if (hostMatch && pathMatch) {
      floor = Math.max(floor, s.trust);
    }
  }
  return floor;
}

export function isOfficialDocSource(url: string): boolean {
  const u = safeParseUrl(url);
  if (!u) return false;
  const h = u.host.toLowerCase();
  const p = u.pathname.toLowerCase();

  for (const s of SOURCE_REGISTRY) {
    if (!s.tags || s.tags.length === 0) continue;
    const ru = safeParseUrl(s.url);
    if (!ru) continue;

    const rh = ru.host.toLowerCase();
    const rp = ru.pathname.toLowerCase();

    const hostMatch = h === rh || h.endsWith("." + rh);
    const pathMatch = rp === "/" ? true : p.startsWith(rp);

    if (hostMatch && pathMatch) {
      return s.tags.includes("official") || s.tags.includes("docs") || s.tags.includes("spec");
    }
  }
  return false;
}

export function getOfficialHostsForQueryHint(): string[] {
  const hosts = new Set<string>();

  for (const s of SOURCE_REGISTRY) {
    if (!s.tags || s.tags.length === 0) continue;
    if (
      !s.tags.includes("official") &&
      !s.tags.includes("docs") &&
      !s.tags.includes("spec")
    ) {
      continue;
    }
    const u = safeParseUrl(s.url);
    if (!u) continue;
    hosts.add(u.host.toLowerCase());
  }

  return Array.from(hosts);
}

function computeTrustSignals(args: {
  domain: GlobalDomain;
  url: string;
  title: string;
  snippet: string;
}): TrustSignals {
  const { domain, url, title, snippet } = args;

  const h = hostOf(url);
  const p = pathOf(url);

  const registryFloor = registryFloorFor(domain, url);

  // penalties
  let penalty = 0;
  if (isLoginWall(h, p)) penalty += 2.0;
  if (isCommercialSeo(h, p)) penalty += 1.6;
  if (isBlogOrCafe(h, p)) penalty += 1.1;

  // boosts
  let officialBoost = 0;
  if (isGovEdu(h)) officialBoost += 1.4;
  if (looksOfficialDocs(h, p)) officialBoost += 1.0;

  // domain-specific boosts (small)
  if (domain === "security" && /(owasp|cve|nist|mitre)/i.test(h)) officialBoost += 0.8;
  if (domain === "dev" && /(w3\.org|whatwg|ecma|ietf)/i.test(h)) officialBoost += 0.8;

  const licenseBoost = detectLicenseHint(url, title, snippet);

  return { officialBoost, penalty, licenseBoost, registryFloor };
}

/**
 * Convert raw trust (float) to 0..5 clamped int-ish
 * - keep one decimal to preserve nuance
 */
function clampTrust(x: number): number {
  const v = Math.max(0, Math.min(5, x));
  return Number(v.toFixed(2));
}

/**
 * Public helper: compute trust for an arbitrary URL using heuristics + registry.
 * This is used by adapters and fetchers.
 */
export function computeTrustScore(args: {
  domain: GlobalDomain;
  url: string;
  title: string;
  snippet: string;
}): number {
  const { domain, url, title, snippet } = args;

  const signals = computeTrustSignals({ domain, url, title, snippet });

  // base trust starts at 3.2 (neutral)
  let trust = 3.2;

  // apply boosts / penalties
  trust += signals.officialBoost;
  trust += signals.licenseBoost;
  trust -= signals.penalty;

  // registry acts as floor (not ceiling)
  trust = Math.max(trust, signals.registryFloor);

  // hard penalty for login pages
  const h = hostOf(url);
  const p = pathOf(url);
  if (isLoginWall(h, p)) trust = Math.min(trust, 1.2);

  return clampTrust(trust);
}

/**
 * Compute query-document relevance score (0..1) using keyword overlap.
 * Lightweight BM25-like scoring without external dependencies.
 */
export function computeRelevanceScore(query: string, result: SearchResult): number {
  const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 1);
  if (queryTerms.length === 0) return 0;

  const docText = `${result.title} ${result.snippet}`.toLowerCase();
  const docWords = new Set(docText.split(/\s+/));

  // Term frequency in document
  let matchCount = 0;
  let exactPhraseBoost = 0;

  for (const term of queryTerms) {
    if (docWords.has(term)) matchCount++;
    // Partial match (substring) for compound words only
    else if (docText.includes(term)) matchCount += 0.5;
  }

  // Exact phrase match bonus
  if (docText.includes(query.toLowerCase())) {
    exactPhraseBoost = 0.3;
  }

  // Coverage ratio: what fraction of query terms appear in doc
  const coverage = matchCount / queryTerms.length;

  // Title match is more important
  const titleText = result.title.toLowerCase();
  const titleMatchBonus = queryTerms.some(t => titleText.includes(t)) ? 0.15 : 0;

  return Math.min(1, coverage + exactPhraseBoost + titleMatchBonus);
}

/**
 * Rank search results by combined trust + relevance score.
 * Formula: finalScore = 0.4 * normalizedTrust + 0.6 * relevance
 */
export function rankSearchResults(
  query: string,
  results: SearchResult[]
): SearchResult[] {
  return results
    .map(r => {
      const relevance = computeRelevanceScore(query, r);
      return { ...r, relevance };
    })
    .sort((a, b) => {
      const scoreA = 0.4 * (a.trust / 5) + 0.6 * (a.relevance ?? 0);
      const scoreB = 0.4 * (b.trust / 5) + 0.6 * (b.relevance ?? 0);
      return scoreB - scoreA;
    });
}

export const AllowedSearchEngine = {
  /**
   * NOTE:
   * - This module is "policy + scoring". It can be used with fetched results or crawled docs.
   * - Real web search fetching is handled elsewhere.
   */
  async search(args: {
    query: string;
    reasoning: ReasoningResult;
    languageHint?: string;
    minTrust?: number;
  }): Promise<SearchResult[]> {
    const { query, reasoning, minTrust = 3.2 } = args;
    const domain = (reasoning.domain as GlobalDomain) ?? "etc";

    // 🔒 Prompt-safe stub for now:
    // - When you wire a real fetcher, you'll replace this output with real results.
    // - But trust scoring path remains the same.
    const candidates = SOURCE_REGISTRY.filter((s) => s.domain === domain);

    if (candidates.length === 0) return [];

    const results = candidates.map((s) => {
      const trust = computeTrustScore({
        domain,
        url: s.url,
        title: "Verified Source",
        snippet: `Verified documentation source for "${query}".`,
      });

      return {
        title: "Verified Source",
        snippet: `This is a high-trust documentation source relevant to "${query}".`,
        source: s.url,
        trust,
      };
    });

    return results.filter((r) => r.trust >= minTrust);
  },
};
