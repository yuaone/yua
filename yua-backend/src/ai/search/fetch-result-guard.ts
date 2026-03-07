// 📂 src/ai/search/fetch-result-guard.ts

import type { FetchedDocument, FetchError } from "./url-fetcher";

export type FetchResult = FetchedDocument | { error: FetchError };

export function isFetchedDocument(
  r: FetchResult | null | undefined
): r is FetchedDocument {
  return !!r && typeof (r as any).text === "string";
}
