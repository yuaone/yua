// 📂 src/ai/search/deep-web-fetch-runner.ts

import { fetchUrlDocument } from "./url-fetcher";
import { isFetchedDocument } from "./fetch-result-guard";

export async function runDeepWebFetch(args: {
  seedUrls: string[];
  maxPages?: number;
}) {
  const { seedUrls, maxPages = 6 } = args;

  const visited = new Set<string>();
  const documents: { url: string; content: string }[] = [];

  for (const url of seedUrls.slice(0, maxPages)) {
    if (visited.has(url)) continue;
    visited.add(url);

    const doc = await fetchUrlDocument(url);

    if (isFetchedDocument(doc) && doc.text.length > 300) {
      documents.push({
        url: doc.finalUrl ?? url,
        content: doc.text,
      });
    }
  }

  return {
    documents,
    documentCount: documents.length,
    hasDocuments: documents.length > 0,
  };
}
