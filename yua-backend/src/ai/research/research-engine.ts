// 📂 src/ai/research/research-engine.ts
// 🔥 YUA ResearchEngine — SSOT SAFE (2025.12)

import { runProviderAuto } from "../../service/provider-engine";
import { VectorEngine } from "../vector/vector-engine";
import { MemoryManager } from "../memory/memory-manager";
import { loadUnifiedMemory } from "../memory/unified-memory-gate";
import { toStringSafe } from "../universal/utils-safe";

export const ResearchEngine = {
  async analyze(input: {
    workspaceId: string;
    userId?: number;
    documents: string[];
    goal?: string;
    compare?: boolean;
  }): Promise<string> {
    try {
      const { workspaceId, userId } = input;
      const docs = Array.isArray(input.documents) ? input.documents : [];
      if (!workspaceId) throw new Error("missing_workspace_id");
      if (docs.length === 0) return "분석할 문서가 없습니다.";

      const goal =
        input.goal?.trim() ||
        "핵심 내용을 요약하고 결론을 제시하라.";

      // 🔒 READ ONLY Memory — Unified Memory Gate (user + project + cross-thread)
      let memoryContext: { content: string }[] = [];
      let unifiedText = "";

      if (userId) {
        const unified = await loadUnifiedMemory({
          workspaceId,
          userId,
          mode: "RESEARCH",
          allowHeavyMemory: true,
        });
        unifiedText = unified.combinedContext;
      } else {
        // Fallback: no userId — legacy path
        memoryContext = await MemoryManager.retrieveContext({
          workspaceId,
          limit: 8,
        });
      }

      const vector = await new VectorEngine().search(
        JSON.stringify(docs),
        5
      );

      const vectorHints =
        vector?.map((v: any) => v?.meta ?? "")
          .filter(Boolean)
          .join("\n") || "";

      const memoryText = unifiedText ||
        memoryContext.map(m => m.content).join("\n");

      const compareFlag = input.compare ? "예" : "아니오";

      const prompt = `
당신은 전문 Research AI 입니다.

[분석 목적]
${goal}

[문서 개수] ${docs.length}
[비교 모드] ${compareFlag}

[📘 입력 문서]
${docs.map((d, i) => `문서 ${i + 1}:\n${d}`).join("\n\n")}

[📚 Vector 힌트]
${vectorHints}

[🧠 Context Memory]
${memoryText}

규칙:
- 텍스트 추측 금지
- 문서 기반 분석만
- 마지막에 결론 요약
`.trim();

      const raw = await runProviderAuto(prompt);
      return toStringSafe(raw) || "분석 실패";
    } catch (e: any) {
      return `ResearchEngine Error: ${String(e)}`;
    }
  },
};
