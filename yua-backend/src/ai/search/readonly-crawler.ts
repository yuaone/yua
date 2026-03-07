// 📂 src/ai/search/readonly-crawler.ts
// 🔒 READ-ONLY CRAWLER — SSOT FINAL (2025.12)

import { extractLinks } from "./link-extractor";
import { fetchUrlDocument, FetchedDocument } from "./url-fetcher";

export type CrawlError = {
  url: string;
  error: string;
};

export type CrawlResult = {
  documents: FetchedDocument[];
  errors: CrawlError[];
  linkCount: number;
};

export async function crawlInputForDocuments(
  input: string
): Promise<CrawlResult> {
  const links = extractLinks(input);

  const documents: FetchedDocument[] = [];
  const errors: CrawlError[] = [];

  for (const url of links) {
    const res = await fetchUrlDocument(url);

    if ("error" in res) {
      errors.push({ url, error: res.error });
      continue;
    }

    // 🔒 READ-ONLY SAFETY
    if (!res.text || res.text.length < 50) continue;

    documents.push(res);
  }

  return {
    documents,
    errors,
    linkCount: links.length,
  };
}
