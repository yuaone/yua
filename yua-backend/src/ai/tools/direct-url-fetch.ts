/**
 * Upgraded Direct URL Fetch (5-depth, robots, sitemap, canonical, dedupe, scoring, safety)
 *
 * Requires deps:
 *   npm i axios cheerio robots-parser fast-xml-parser file-type
 *
 * Optional (LLM relevance scoring):
 *   - set OPENAI_API_KEY in env
 *   - uses OpenAI Responses API via simple HTTPS call (no sdk dependency)
 */

import axios from "axios";
import { URL } from "url";
import * as dns from "dns/promises";
import zlib from "zlib";
import { pipeline } from "stream/promises";
import { Readable } from "stream";

import * as cheerio from "cheerio";
import robotsParser from "robots-parser";
import { XMLParser } from "fast-xml-parser";
import crypto from "crypto";
import { extractLinks } from "../search/link-extractor";
import { crawlMultiHop } from "../search/multi-hop-crawler";
/* --------------------------------------------------
 * Caps / Limits (SSOT-ish)
 * -------------------------------------------------- */
const MAX_COMPRESSED_BYTES = 1_000_000; // compressed fetch cap
const MAX_DECOMPRESSED_BYTES = 2_500_000; // gzip bomb protection
const TIMEOUT_MS = 8000;

const MAX_DEPTH = 5;
const MAX_TOTAL_PAGES = 12;
const MAX_BRANCH_PER_PAGE = 6;
const MAX_REDIRECTS = 5;

const MAX_RENDER_CHARS = 20_000;

/* --------------------------------------------------
 * Rate limiting / concurrency
 * -------------------------------------------------- */
const CONCURRENCY = 4;
const RATE_RPS = 2; // tokens per second
const RATE_BURST = 4;

/* --------------------------------------------------
 * SSRF protections
 * -------------------------------------------------- */
const BLOCKED_IP_RANGES = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[0-1])\./,
  /^0\./,
];

function isPrivateIP(ip: string): boolean {
  return BLOCKED_IP_RANGES.some((r) => r.test(ip));
}

async function resolveAndValidateHost(hostname: string) {
  const records = await dns.lookup(hostname, { all: true });
  for (const r of records) {
    if (isPrivateIP(r.address)) throw new Error("SSRF_BLOCKED_PRIVATE_IP");
  }
}

/* --------------------------------------------------
 * Helpers: semaphore + token bucket
 * -------------------------------------------------- */
class Semaphore {
  private available: number;
  private waiters: Array<() => void> = [];
  constructor(n: number) {
    this.available = Math.max(1, n);
  }
  async acquire() {
    if (this.available > 0) {
      this.available--;
      return;
    }
    await new Promise<void>((resolve) => this.waiters.push(resolve));
    this.available--;
  }
  release() {
    this.available++;
    const w = this.waiters.shift();
    if (w) w();
  }
}

class TokenBucket {
  private tokens: number;
  private last: number;
  constructor(
    private refillPerSec: number,
    private burst: number
  ) {
    this.tokens = burst;
    this.last = Date.now();
  }
  async take(n = 1) {
    while (true) {
      this.refill();
      if (this.tokens >= n) {
        this.tokens -= n;
        return;
      }
      await new Promise((r) => setTimeout(r, 120));
    }
  }
  private refill() {
    const now = Date.now();
    const deltaSec = (now - this.last) / 1000;
    if (deltaSec <= 0) return;
    this.tokens = Math.min(this.burst, this.tokens + deltaSec * this.refillPerSec);
    this.last = now;
  }
}

const sem = new Semaphore(CONCURRENCY);
const bucket = new TokenBucket(RATE_RPS, RATE_BURST);

/* --------------------------------------------------
 * URL Normalization + canonical
 * -------------------------------------------------- */
function normalizeUrl(input: string): URL {
  const url = new URL(input);
  if (!["http:", "https:"].includes(url.protocol)) throw new Error("INVALID_PROTOCOL");
  return url;
}

function stripTrackingParams(u: URL): URL {
  const out = new URL(u.toString());
  const toDelete: string[] = [];
  out.searchParams.forEach((_, k) => {
    const kk = k.toLowerCase();
    if (kk.startsWith("utm_") || kk === "gclid" || kk === "fbclid") toDelete.push(k);
  });
  toDelete.forEach((k) => out.searchParams.delete(k));
  return out;
}

function normalizeCanonical(u: URL): string {
  const x = stripTrackingParams(u);

  // remove fragment
  x.hash = "";

  // default port removal
  if ((x.protocol === "http:" && x.port === "80") || (x.protocol === "https:" && x.port === "443")) {
    x.port = "";
  }

  // lowercase host
  x.hostname = x.hostname.toLowerCase();

  // normalize pathname
  if (!x.pathname) x.pathname = "/";
  // collapse multiple slashes
  x.pathname = x.pathname.replace(/\/{2,}/g, "/");

  // stable query ordering
  const params = Array.from(x.searchParams.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  x.search = "";
  for (const [k, v] of params) x.searchParams.append(k, v);

  // remove trailing slash (except root) to avoid dupes
  if (x.pathname.length > 1 && x.pathname.endsWith("/")) {
    x.pathname = x.pathname.slice(0, -1);
  }

  return x.toString();
}

/* --------------------------------------------------
 * Fetch + redirects + decompression + mime sniffing
 * -------------------------------------------------- */

async function decompressIfNeeded(buf: Buffer, encoding: string | undefined): Promise<Buffer> {
  const enc = (encoding ?? "").toLowerCase().trim();
  if (!enc) return buf;

  if (enc.includes("gzip")) {
    // gunzip with output cap
    let outBytes = 0;
    const gunzip = zlib.createGunzip();

    const chunks: Buffer[] = [];
    gunzip.on("data", (c: Buffer) => {
      outBytes += c.length;
      if (outBytes > MAX_DECOMPRESSED_BYTES) {
        gunzip.destroy(new Error("GZIP_BOMB_DETECTED"));
      } else {
        chunks.push(c);
      }
    });

    await pipeline(Readable.from(buf), gunzip);
    return Buffer.concat(chunks);
  }

  // br/deflate can be added later; for now, refuse to decompress unknown enc
  if (enc.includes("br") || enc.includes("deflate")) {
    throw new Error("UNSUPPORTED_CONTENT_ENCODING");
  }

  return buf;
}

function looksTextualContentType(ct: string): boolean {
  const base = ct.split(";")[0].trim().toLowerCase();
  if (base.startsWith("text/")) return true;
  return ["application/json", "application/pdf", "application/xml", "application/xhtml+xml"].includes(base);
}

async function sniffContentType(buf: Buffer, headerCt: string): Promise<string> {
  const baseHeader = (headerCt || "").split(";")[0].trim().toLowerCase();

  // file-type is best-effort
 const { fileTypeFromBuffer } = await import("file-type");
 const ft = await fileTypeFromBuffer(buf).catch(() => null);
  const guessed = ft?.mime?.toLowerCase();

  // if header claims text but sniff says image/video => reject (protects content confusion)
  if (guessed && (guessed.startsWith("image/") || guessed.startsWith("video/") || guessed.startsWith("audio/"))) {
    throw new Error("MIME_SNIFF_REJECT_NON_TEXTUAL");
  }

  // if header missing/garbage, fall back to guessed
  if (!baseHeader) return guessed ?? "application/octet-stream";

  return baseHeader;
}

async function safeFetchOnce(url: URL) {
  await resolveAndValidateHost(url.hostname);
  await bucket.take(1);

  const res = await axios({
    method: "GET",
    url: url.toString(),
    timeout: TIMEOUT_MS,
    maxContentLength: MAX_COMPRESSED_BYTES,
    maxBodyLength: MAX_COMPRESSED_BYTES,
    responseType: "arraybuffer",
    decompress: false, // IMPORTANT: we handle gzip ourselves
    maxRedirects: 0, // IMPORTANT: manual redirects so we can re-validate host SSRF
    validateStatus: (s) => (s >= 200 && s < 400) || s === 301 || s === 302 || s === 303 || s === 307 || s === 308,
    headers: {
      "User-Agent": "YUA-DeepFetch/3.0",
      Accept: "text/plain,text/html,application/json,application/pdf;q=0.9,application/xml;q=0.7,*/*;q=0.1",
    },
  });

  return res;
}

async function safeFetchWithRedirects(start: URL) {
  let current = new URL(start.toString());
  for (let i = 0; i <= MAX_REDIRECTS; i++) {
    const res = await safeFetchOnce(current);

    const status = Number(res.status);
    const loc = String(res.headers["location"] ?? "");
    if ([301, 302, 303, 307, 308].includes(status) && loc) {
      const next = new URL(loc, current);
      if (!["http:", "https:"].includes(next.protocol)) throw new Error("INVALID_REDIRECT_PROTOCOL");
      // SSRF check on redirect host
      await resolveAndValidateHost(next.hostname);
      current = next;
      continue;
    }

    const encoding = String(res.headers["content-encoding"] ?? "");
    const headerCt = String(res.headers["content-type"] ?? "");

    const compressed = Buffer.from(res.data);
    const decompressed = await decompressIfNeeded(compressed, encoding);

    const ct = await sniffContentType(decompressed, headerCt);

    if (!looksTextualContentType(ct)) throw new Error("UNSUPPORTED_CONTENT_TYPE");

    return {
      finalUrl: current,
      contentType: ct,
      buffer: decompressed,
      headers: res.headers,
      status: res.status,
    };
  }
  throw new Error("TOO_MANY_REDIRECTS");
}

/* --------------------------------------------------
 * HTML parse: links + canonical + title
 * -------------------------------------------------- */
type HtmlParsed = {
  canonical?: string;
  title?: string;
  text: string;
  links: string[];
  sitemapHints: string[];
};

function parseHtml(html: string, baseUrl: URL): HtmlParsed {
  const $ = cheerio.load(html);

  // Remove junk
  $("script,noscript,style,svg,canvas,iframe").remove();

  const canonicalHref = $('link[rel="canonical"]').attr("href");
  let canonical: string | undefined;
  if (canonicalHref) {
    try {
      canonical = new URL(canonicalHref, baseUrl).toString();
    } catch {}
  }

  const title = ($("title").first().text() || "").trim() || undefined;

  // Extract links
  const links: string[] = [];
  $("a[href]").each((_, el) => {
    const href = String($(el).attr("href") ?? "").trim();
    if (!href) return;
    // skip mailto/tel/javascript
    if (/^(mailto:|tel:|javascript:)/i.test(href)) return;
    try {
      const abs = new URL(href, baseUrl).toString();
      links.push(abs);
    } catch {}
  });

  // Some pages expose sitemap link
  const sitemapHints: string[] = [];
  $('a[href*="sitemap"]').each((_, el) => {
    const href = String($(el).attr("href") ?? "");
    try {
      sitemapHints.push(new URL(href, baseUrl).toString());
    } catch {}
  });

  // Text render
  const text = $("body").text().replace(/\s+/g, " ").trim().slice(0, MAX_RENDER_CHARS);

  return {
    canonical,
    title,
    text,
    links,
    sitemapHints: Array.from(new Set(sitemapHints)).slice(0, 8),
  };
}

/* --------------------------------------------------
 * robots.txt + sitemap
 * -------------------------------------------------- */
type RobotsState = {
  parser: ReturnType<typeof robotsParser>;
  sitemaps: string[];
  crawlDelayMs?: number;
};

const robotsCache = new Map<string, RobotsState>();

async function getRobotsForHost(base: URL): Promise<RobotsState> {
  const key = `${base.protocol}//${base.host}`;
  const cached = robotsCache.get(key);
  if (cached) return cached;

  const robotsUrl = new URL("/robots.txt", base).toString();

  let body = "";
  try {
    const fetched = await safeFetchWithRedirects(new URL(robotsUrl));
    body = fetched.buffer.toString("utf-8").slice(0, 200_000);
  } catch {
    // no robots is treated as allow all
    body = "";
  }

  const parser = robotsParser(robotsUrl, body);
  const sitemaps = (parser.getSitemaps?.() ?? []).filter((u: any) => typeof u === "string");

  // best-effort crawl-delay (robots-parser doesn't expose easily in all versions)
  // We keep simple: if Crawl-delay appears, parse it.
  let crawlDelayMs: number | undefined;
  const m = body.match(/Crawl-delay:\s*([0-9.]+)/i);
  if (m) {
    const sec = Number(m[1]);
    if (Number.isFinite(sec) && sec > 0) crawlDelayMs = Math.min(5000, Math.floor(sec * 1000));
  }

  const state = { parser, sitemaps, crawlDelayMs };
  robotsCache.set(key, state);
  return state;
}

async function fetchSitemapUrls(sitemapUrl: string): Promise<string[]> {
  try {
    const fetched = await safeFetchWithRedirects(new URL(sitemapUrl));
    const xml = fetched.buffer.toString("utf-8").slice(0, 3_000_000);

    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "",
      removeNSPrefix: true,
    });

    const doc = parser.parse(xml);

    // sitemapindex -> nested sitemaps
    const sitemapIndex = doc?.sitemapindex?.sitemap;
    if (sitemapIndex) {
      const items = Array.isArray(sitemapIndex) ? sitemapIndex : [sitemapIndex];
      const nested = items.map((x: any) => String(x?.loc ?? "")).filter(Boolean).slice(0, 10);
      const out: string[] = [];
      for (const n of nested) {
        out.push(...(await fetchSitemapUrls(n)));
        if (out.length > 200) break;
      }
      return out;
    }

    // urlset -> urls
    const urlset = doc?.urlset?.url;
    if (urlset) {
      const items = Array.isArray(urlset) ? urlset : [urlset];
      return items
        .map((x: any) => String(x?.loc ?? ""))
        .filter((u) => u.startsWith("http"))
        .slice(0, 500);
    }
  } catch {
    // ignore sitemap errors
  }
  return [];
}

/* --------------------------------------------------
 * Similarity dedupe (SimHash 64-bit)
 * -------------------------------------------------- */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 2)
    .slice(0, 1500);
}

function hash64(s: string): bigint {
  const h = crypto.createHash("sha256").update(s).digest();
  // take first 8 bytes
  let x = 0n;
  for (let i = 0; i < 8; i++) x = (x << 8n) | BigInt(h[i]);
  return x;
}

function simhash64(text: string): bigint {
  const toks = tokenize(text);
  const weights = new Array<number>(64).fill(0);

  for (const t of toks) {
    const h = hash64(t);
    for (let i = 0; i < 64; i++) {
      const bit = (h >> BigInt(63 - i)) & 1n;
      weights[i] += bit === 1n ? 1 : -1;
    }
  }

  let out = 0n;
  for (let i = 0; i < 64; i++) {
    if (weights[i] > 0) out |= 1n << BigInt(63 - i);
  }
  return out;
}

function hamming64(a: bigint, b: bigint): number {
  let x = a ^ b;
  let c = 0;
  while (x) {
    x &= x - 1n;
    c++;
  }
  return c;
}

/* --------------------------------------------------
 * Relevance scoring
 * - Deterministic fallback
 * - Optional LLM scoring if OPENAI_API_KEY exists
 * -------------------------------------------------- */
function deterministicRelevanceScore(query: string, text: string): number {
  const q = tokenize(query);
  const t = new Set(tokenize(text));
  if (q.length === 0) return 0.2;

  const hit = q.filter((w) => t.has(w)).length;
  const ratio = hit / q.length;
  // tiny bias for length (avoid empty pages)
  const lenBias = Math.min(0.2, text.length / 20000);
  return Math.max(0, Math.min(1, 0.15 + ratio * 0.75 + lenBias));
}

async function llmRelevanceScore(query: string, title: string | undefined, text: string): Promise<number | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  // hard cap
  const snippet = text.slice(0, 2500);

  try {
    const resp = await axios({
      method: "POST",
      url: "https://api.openai.com/v1/responses",
      timeout: 8000,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      data: {
        model: "gpt-4.1-mini",
        temperature: 0,
        input: [
          {
            role: "system",
            content:
              "Return JSON only: {\"relevance\": number between 0 and 1}. No extra keys, no text.",
          },
          {
            role: "user",
            content: `Query: ${query}\nTitle: ${title ?? ""}\nContent:\n${snippet}`,
          },
        ],
        max_output_tokens: 60,
      },
    });

    const outText = String(resp.data?.output_text ?? "").trim();
    const m = outText.match(/\{[\s\S]*\}/);
    if (!m) return null;
    const json = JSON.parse(m[0]);
    const r = Number(json?.relevance);
    if (!Number.isFinite(r)) return null;
    return Math.max(0, Math.min(1, r));
  } catch {
    return null;
  }
}

/* --------------------------------------------------
 * Render content by content-type (text/html handled via parser)
 * -------------------------------------------------- */
function renderNonHtml(buffer: Buffer, contentType: string): string {
  const ct = contentType.split(";")[0].trim().toLowerCase();

  if (ct === "application/json") {
    try {
      const json = JSON.parse(buffer.toString("utf-8"));
      return JSON.stringify(json, null, 2).slice(0, MAX_RENDER_CHARS);
    } catch {
      return buffer.toString("utf-8").slice(0, MAX_RENDER_CHARS);
    }
  }

  if (ct === "application/pdf") {
    // PDF parsing is intentionally not implemented here (would add pdf-parse).
    // Return a small placeholder to avoid garbage decode.
    return "[PDF] (parsing not enabled in this module)";
  }

  if (ct === "application/xml" || ct === "application/xhtml+xml") {
    return buffer.toString("utf-8").replace(/\s+/g, " ").slice(0, MAX_RENDER_CHARS);
  }

  return buffer.toString("utf-8").slice(0, MAX_RENDER_CHARS);
}

/* --------------------------------------------------
 * Main: runDirectUrlFetch (upgraded)
 * -------------------------------------------------- */
export async function runDirectUrlFetch(payload: {
  url?: string;
  urls?: string[];
  input?: string;
  maxSegments?: number;
}) {
  const input = payload.input ?? payload.url ?? "";

  const urls =
    payload.urls?.length
      ? payload.urls
      : payload.url
      ? [payload.url]
      : extractLinks(input);

  if (!urls.length) {
    return {
      status: "ERROR",
      error: "NO_URL_PROVIDED",
    };
  }

  const maxSegments =
    typeof payload.maxSegments === "number"
      ? Math.max(3, Math.min(5, payload.maxSegments))
      : 3;

  const crawl = await crawlMultiHop(urls.slice(0, 5), {
    maxSegments,
    maxSeeds: 3,
    maxPerSegment: 4,
    maxTotalDocs: 12,
    concurrency: 5,
    sameHostOnly: true,
    deadlineMs: 20000,
  });

  return {
    status: "OK",
    output: {
      documents: crawl.documents.map((d) => ({
        url: d.finalUrl ?? d.url,
        content: d.text,
      })),
      documentCount: crawl.documents.length,
      hasDocuments: crawl.documents.length > 0,
      hasErrors: crawl.errors.length > 0,
      segments: crawl.segments,
    },
  };
}

