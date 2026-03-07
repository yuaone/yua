// 📂 src/ai/doc/doc-engine.ts
// 🔥 YUA-AI DocEngine — ENTERPRISE ULTRA FINAL (2025.11)
// ----------------------------------------------------------------------
// ✔ API 문서, 기술문서, 사업계획서 자동 생성
// ✔ GPT/Gemini/Claude ProviderAuto 기반
// ✔ Memory + VectorMemory 기반 컨텍스트 자동 포함
// ✔ Markdown/텍스트 형식 자동 생성
// ✔ undefined/null 0%
// ----------------------------------------------------------------------

import { runProviderAuto } from "../../service/provider-engine";
import { MemoryManager } from "../memory/legacy-memory-adapter";
import { VectorEngine } from "../vector/vector-engine";
import { toStringSafe } from "../universal/utils-safe";

export const DocEngine = {
  /**
   * 📝 문서 생성
   * type: api | tech | plan
   */
  async generate(input: {
    type: "api" | "tech" | "plan";
    title?: string;
    content?: string;
    items?: string[];
  }): Promise<string> {
    try {
      const { type, title, content, items } = input;

      const docTitle = title?.trim() || "자동 생성 문서";

      // Memory assemble
      const mem = await MemoryManager.assembleMemory({
        userMessage: docTitle,
      });

      const short = mem.short.map(m => `[${m.role}] ${m.content}`).join("\n");
      const long = Object.entries(mem.long)
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n");

      // Vector Memory
      const vector = await new VectorEngine().search(docTitle, 5);
      const vectorHints =
        vector.map((v: any) => v?.meta ?? "").filter(Boolean).join("\n") || "";

      const docItems = (items ?? []).map((i, idx) => `${idx + 1}. ${i}`).join("\n");

      const purpose = {
        api: "API 문서를 작성하라. 요청/응답/예제 포함.",
        tech: "기술 문서를 작성하라. 아키텍처/흐름도/엔진 설명 포함.",
        plan: "사업계획서를 작성하라. 문제/해결/시장/매출모델/로드맵 포함."
      }[type];

      const prompt = `
당신은 YUA-AI DocEngine이며, 다음 문서를 자동 생성하는 엔진이다.

[문서 종류]: ${type}
[문서 제목]: ${docTitle}

[내용 힌트]
${content ?? "(없음)"}

[항목 리스트]
${docItems || "(항목 없음)"}

[Memory.short]
${short}

[Memory.long]
${long}

[VectorMemory]
${vectorHints}

규칙:
- undefined/null 생성 금지
- Markdown 형식 (+ 제목/소제목)
- 실제 전문가가 작성한 수준으로 자연스럽고 완전하게 작성
- 너무 템플릿형이 되지 않게, 맥락 기반으로 생성

[목적]
${purpose}

이 정보를 기반으로 최종 문서를 생성하라.
`.trim();

      const raw = await runProviderAuto(prompt);
      return toStringSafe(raw) || "문서 생성 실패";

    } catch (e: any) {
      return `DocEngine Error: ${String(e)}`;
    }
  },
};
