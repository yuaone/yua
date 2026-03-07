// 🔬 YUA Research Summarizer Runtime — FINAL (SSOT 2026.01)
// --------------------------------------------------
// ✔ READ-ONLY 요약
// ✔ 공통점 / 차이 / 불확실성 분리
// ✔ claimBoundary 산출 (단정 가능 여부)
// ✔ Trust / Source 수 기반 confidence
// ✔ Prompt-safe (결론·추천·판단 금지)
// --------------------------------------------------

import type { SearchResult } from "../../search/allowed-search-engine";
import { rankSearchResults } from "../../search/allowed-search-engine";

export type ClaimBoundary =
  | "CANNOT_ASSERT"   // 단정 불가
  | "CAN_SUGGEST"     // 가능성 언급
  | "CAN_ASSERT";     // 사실 단정 가능

export interface ResearchSummaryResult {
  summaryBlock: string;
  sourceCount: number;
  confidenceHint: "LOW" | "MEDIUM" | "HIGH";
  claimBoundary: ClaimBoundary;
  facetConflict?: boolean;
}

/* -------------------------------------------------- */
/* Internal Heuristics (SSOT)                          */
/* -------------------------------------------------- */

function inferConfidence(count: number): "LOW" | "MEDIUM" | "HIGH" {
  if (count >= 5) return "HIGH";
  if (count >= 3) return "MEDIUM";
  return "LOW";
}

function inferClaimBoundary(args: {
  sourceCount: number;
  minTrust: number;
}): ClaimBoundary {
  const { sourceCount, minTrust } = args;

  // 🔒 단일 출처 or 저신뢰 → 단정 금지
  if (sourceCount < 2 || minTrust < 3) {
    return "CANNOT_ASSERT";
  }

  // 🔹 다수 출처 + 중간 신뢰
  if (sourceCount >= 3 && minTrust >= 3) {
    return "CAN_SUGGEST";
  }

  // 🔥 다수 출처 + 고신뢰
  if (sourceCount >= 5 && minTrust >= 4) {
    return "CAN_ASSERT";
  }

  return "CANNOT_ASSERT";
}

function normalizeSnippet(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/[\r\n]+/g, " ")
    .trim();
}

/* -------------------------------------------------- */
/* Research Summarizer                                 */
/* -------------------------------------------------- */

export async function runResearchSummarizer(args: {
  query: string;
  results: (SearchResult & { facet?: string })[];
  maxSources?: number;
}): Promise<ResearchSummaryResult> {
  const { query, results, maxSources = 5 } = args;

  if (!results.length) {
    return {
      summaryBlock: `
[RESEARCH SUMMARY]
검색 결과가 충분하지 않다.
공통된 사실을 도출할 수 없다.
`.trim(),
      sourceCount: 0,
      confidenceHint: "LOW",
      claimBoundary: "CANNOT_ASSERT",
    };
  }

  // Rank by relevance + trust before slicing
  // JS spread in rankSearchResults preserves extra properties like facet at runtime
  const ranked = rankSearchResults(query, results as SearchResult[]) as typeof results;
  const topResults = ranked
    .filter((r) => r.trust >= 2)
    .slice(0, maxSources);

  const facetSet = new Set(
    topResults.map((r) => r.facet).filter(Boolean)
  );

  const facetConflict = facetSet.size >= 2;
  const sourceCount = topResults.length;
  const confidenceHint = inferConfidence(sourceCount);

  const minTrust = Math.min(
    ...topResults.map((r) =>
      typeof r.trust === "number" ? r.trust : 0
    )
  );

  const claimBoundary = inferClaimBoundary({
    sourceCount,
    minTrust,
  });

  /* -------------------------------------------------- */
  /* Summary Construction                              */
  /* -------------------------------------------------- */

  const bullets = topResults.map((r, idx) => {
    return `(${idx + 1}) ${normalizeSnippet(r.snippet)}\n출처: ${r.source}`;
  });

  const summaryBlock = `
[RESEARCH SUMMARY — READ ONLY]

아래 내용은 여러 출처에서 반복적으로 언급되는
정보를 그대로 묶은 요약이다.
새로운 주장이나 결론은 포함하지 않는다.

[질문 맥락]
${query}

[공통적으로 언급되는 내용]
${bullets.join("\n\n")}

${facetConflict ? `
[관점 차이 감지]
서로 다른 검색 관점(facet)에서
상이한 설명 또는 강조점이 관측되었다.
` : ""}

[신뢰도 판단]
- 사용 출처 수: ${sourceCount}
- 최소 신뢰도: ${minTrust}
- 종합 신뢰 수준: ${confidenceHint}
- 단정 가능 여부: ${claimBoundary}

⚠️ 이 요약은 참고용이다.
`.trim();

  return {
    summaryBlock,
    sourceCount,
    confidenceHint,
    claimBoundary,
    facetConflict,
  };
}
