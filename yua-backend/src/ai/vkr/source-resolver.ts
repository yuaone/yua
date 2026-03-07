// src/ai/vkr/source-resolver.ts

import { VKRSource } from "./types";

const ALLOWED_DOMAINS = [
  "firebase.google.com",
  "developers.google.com",
  "github.com",
  "cloud.google.com",
  "developer.mozilla.org",
];

export async function resolveSources(query: string): Promise<VKRSource[]> {
  // v1: 검색 API 연결 지점 (Google CSE / Bing 등)
  // 여기서는 구조만 고정

  const mockedResults: VKRSource[] = [
    {
      url: "https://firebase.google.com/docs/auth",
      domain: "firebase.google.com",
      title: "Firebase Authentication Documentation",
      publisher: "Google",
      license: "CC BY 4.0",
    },
  ];

  return mockedResults.filter(src =>
    ALLOWED_DOMAINS.some(d => src.domain.endsWith(d))
  );
}
