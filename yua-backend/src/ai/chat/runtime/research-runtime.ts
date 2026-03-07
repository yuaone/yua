// 🔥 YUA Research Runtime — SSOT PHASE 3.5 (2025.12)

import { ResearchEngine } from "../../research/research-engine";

export type ResearchRuntimeResult = {
  researchContext?: string;
};

export async function runResearchRuntime(args: {
  workspaceId: string;
  documents: { url: string; content: string }[];
  goal?: string;
  enabled: boolean;
}): Promise<ResearchRuntimeResult> {
  const { workspaceId, documents, goal, enabled } = args;

  if (!enabled || documents.length === 0) {
    return {};
  }

  if (!workspaceId) {
    throw new Error("workspaceId is required for ResearchRuntime");
  }

  /* -------------------------------------------------- */
  /* 1️⃣ Goal 정규화                                    */
  /* -------------------------------------------------- */
  const normalizedGoal =
    goal?.trim() ||
    (documents.length > 1
      ? "여러 문서를 비교 분석하고 공통점과 차이점을 정리하라."
      : "이 문서의 핵심 내용을 요약하고 중요한 결론을 도출하라.");

  /* -------------------------------------------------- */
  /* 2️⃣ Compare 정책                                   */
  /* -------------------------------------------------- */
  const compare =
    documents.length > 1 &&
    /(비교|차이|공통|vs|difference|compare)/i.test(
      normalizedGoal
    );

  /* -------------------------------------------------- */
  /* 3️⃣ Research 실행                                  */
  /* -------------------------------------------------- */
  const researchText = await ResearchEngine.analyze({
    workspaceId,
    documents: documents.map((d) => d.content),
    goal: normalizedGoal,
    compare,
  });

  return {
    researchContext: researchText,
  };
}
