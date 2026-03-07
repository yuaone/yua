// src/ai/vkr/types.ts

export interface VKRRequest {
  query: string;
  context?: string;
  maxDocs?: number;
  triggeredBy?: "lite" | "user" | "fallback";
}

export interface VKRSource {
  id?: number;
  url: string;
  domain: string;
  title?: string;
  publisher?: string;
  license: string;
}

export interface VKRHint {
  summary: string;
  relevance: number;
  source: VKRSource;
}

export interface VKRResult {
  ok: boolean;
  hints: VKRHint[];
  reason?: string;
}
