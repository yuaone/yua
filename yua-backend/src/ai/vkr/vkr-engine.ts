// src/ai/vkr/vkr-engine.ts

import { VKRRequest, VKRResult } from "./types";
import { resolveSources } from "./source-resolver";
import { isLicenseAllowed } from "./license-checker";
import { fetchAndStoreDocument } from "./fetcher";
import { extractRelevantText } from "./extractor";
import { generateHint } from "./hint-generator";

export async function runVKR(req: VKRRequest): Promise<VKRResult> {
  const sources = await resolveSources(req.query);
  const hints = [];

  for (const src of sources) {
    if (!isLicenseAllowed(src)) continue;

    const text = await fetchAndStoreDocument(src.id ?? 0, src.url);
    const extracted = extractRelevantText(text, req.query);
    const hint = generateHint(extracted, src);

    if (hint) hints.push(hint);
  }

  return {
    ok: true,
    hints: hints.slice(0, req.maxDocs ?? 2),
  };
}
