// src/ai/vkr/hint-generator.ts

import { VKRHint, VKRSource } from "./types";

export function generateHint(
  extracted: string,
  source: VKRSource
): VKRHint | null {
  if (!extracted || extracted.length < 50) return null;

  return {
    summary: extracted.slice(0, 300),
    relevance: Math.min(1, extracted.length / 300),
    source,
  };
}
