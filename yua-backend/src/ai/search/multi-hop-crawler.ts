// 📂 src/ai/search/multi-hop-crawler.ts
// 🔥 SSOT Multi-Hop Crawler (Segment-limited 3~5, Parallel, Safe)

import { fetchUrlDocument, type FetchedDocument } from "./url-fetcher";

export type CrawlError = {
  url: string;
  error: string;
};

export type MultiHopCrawlOptions = {
  maxSegments?: number;      // 3~5
  maxSeeds?: number;         // 1~5
  maxPerSegment?: number;    // 1~6
  maxTotalDocs?: number;     // 1~20
  concurrency?: number;      // 1~6
  sameHostOnly?: boolean;    // default true
  deadlineMs?: number;       // 전체 제한 시간
};

export type MultiHopCrawlResult = {
  documents: FetchedDocument[];
  errors: CrawlError[];
  segments: {
    segmentIndex: number;
    fetchedCount: number;
    okCount: number;
    errCount: number;
    sampleUrls: string[];
  }[];
};

/* -------------------------------------------------- */
/* Utils                                              */
/* -------------------------------------------------- */

function clamp(v: number | undefined, min: number, max: number, d: number) {
  const n = typeof v === "number" ? Math.floor(v) : d;
  return Math.max(min, Math.min(max, n));
}

function normalizeUrl(u: string): string | null {
  try {
    const x = new URL(u);
    if (!["http:", "https:"].includes(x.protocol)) return null;
    x.hash = "";
    return x.toString();
  } catch {
    return null;
  }
}

function extractLinksFromHtml(html: string, baseUrl: string, cap: number) {
  const out: string[] = [];
  const seen = new Set<string>();
  const base = new URL(baseUrl);

  const re = /\bhref\s*=\s*["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;

  while ((m = re.exec(html)) && out.length < cap) {
    const raw = m[1]?.trim();
    if (!raw) continue;
    if (/^(mailto:|tel:|javascript:|data:)/i.test(raw)) continue;

    try {
      const resolved = new URL(raw, base).toString();
      const norm = normalizeUrl(resolved);
      if (!norm) continue;
      if (seen.has(norm)) continue;
      seen.add(norm);
      out.push(norm);
    } catch {}
  }

  return out;
}

async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (x: T) => Promise<R>
): Promise<R[]> {
  const out: R[] = [];
  let i = 0;

  const workers = Array.from({ length: limit }, async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx]);
    }
  });

  await Promise.all(workers);
  return out;
}

/* -------------------------------------------------- */
/* Main                                               */
/* -------------------------------------------------- */

export async function crawlMultiHop(
  seedUrls: string[],
  opts?: MultiHopCrawlOptions
): Promise<MultiHopCrawlResult> {

  const maxSegments = clamp(opts?.maxSegments, 3, 5, 3);
  const maxSeeds = clamp(opts?.maxSeeds, 1, 5, 3);
  const maxPerSegment = clamp(opts?.maxPerSegment, 1, 6, 4);
  const maxTotalDocs = clamp(opts?.maxTotalDocs, 1, 20, 12);
  const concurrency = clamp(opts?.concurrency, 1, 6, 4);
  const sameHostOnly = opts?.sameHostOnly !== false;
  const deadlineMs = clamp(opts?.deadlineMs, 2000, 60000, 18000);

  const start = Date.now();

  const seeds = seedUrls
    .map(normalizeUrl)
    .filter((x): x is string => !!x)
    .slice(0, maxSeeds);

  const visited = new Set<string>();
  const documents: FetchedDocument[] = [];
  const errors: CrawlError[] = [];
  const segments: MultiHopCrawlResult["segments"] = [];

  if (seeds.length === 0) {
    return { documents, errors, segments };
  }

  const seedHosts = new Set(seeds.map((u) => new URL(u).host));
  let queue: string[] = [...seeds];

  for (let seg = 0; seg < maxSegments; seg++) {

    if (Date.now() - start > deadlineMs) break;
    if (documents.length >= maxTotalDocs) break;
    if (queue.length === 0) break;

    const batch = queue
      .splice(0, seg === 0 ? maxSeeds : maxPerSegment)
      .filter((u) => !visited.has(u));

    for (const u of batch) visited.add(u);
    if (batch.length === 0) continue;

    const results = await runWithConcurrency(
      batch,
      concurrency,
      async (url) => {
        const res = await fetchUrlDocument(url);
        return { url, res };
      }
    );

    let okCount = 0;
    let errCount = 0;
    const next: string[] = [];

    for (const r of results) {
      if ("error" in r.res) {
        errCount++;
        errors.push({ url: r.url, error: r.res.error });
        continue;
      }

      okCount++;
      documents.push(r.res);

      if (documents.length >= maxTotalDocs) break;

      if (r.res.contentType === "text/html") {
        const links = extractLinksFromHtml(
          r.res.text,
          r.res.finalUrl ?? r.res.url,
          12
        );

        for (const l of links) {
          if (visited.has(l)) continue;
          if (sameHostOnly) {
            const host = new URL(l).host;
            if (!seedHosts.has(host)) continue;
          }
          next.push(l);
        }
      }
    }

    queue.push(...Array.from(new Set(next)));

    segments.push({
      segmentIndex: seg,
      fetchedCount: batch.length,
      okCount,
      errCount,
      sampleUrls: batch.slice(0, 5),
    });
  }

  return { documents, errors, segments };
}