// 📂 src/ai/compress/compress-engine.ts
// 🔥 YUA-AI CompressEngine — 2025.11 ENTERPRISE ULTRA FINAL
// --------------------------------------------------------------------
// ✔ 긴 입력 무손실 압축 (Lossless)
// ✔ 핵심 정보 / 논리 / 구조 분리
// ✔ 긴 프로젝트 파일 / 코드 / 문서 요약 대응
// ✔ ProviderAuto(GPT/Gemini/Claude) 자동 선택
// ✔ utils-safe / compress-utils 완전 호환
// --------------------------------------------------------------------

import { runProviderAuto } from "../../service/provider-engine";
import { toStringSafe } from "../universal/utils-safe";
import { cleanText, splitChunks } from "./compress-utils";

export interface CompressInput {
  text: string;
  mode?: "summary" | "logic" | "ultra"; // 요약 / 사고 / 초압축
}

export const CompressEngine = {
  // -----------------------------------------------------------
  // 메인 실행
  // -----------------------------------------------------------
  async compress(input: CompressInput): Promise<string> {
    const rawText = input?.text || "";
    const mode = input?.mode || "summary";

    if (!rawText.trim()) return "요약할 텍스트가 없습니다.";

    // 1) 전처리
    const cleaned = cleanText(rawText);

    // 2) 긴 텍스트 chunk 분리
    const chunks = splitChunks(cleaned, 3500);

    let results: string[] = [];

    // 3) chunk 단위로 압축
    for (const chunk of chunks) {
      const prompt = this.buildPrompt(chunk, mode);
      const raw = await runProviderAuto(prompt);
      const out = toStringSafe(raw);
      results.push(out);
    }

    // 4) chunk 요약 합치기
    const merged = results.join("\n");

    // 5) 마지막 초압축 단계 (ultra)
    if (mode === "ultra") {
      const finalPrompt = `
아래 내용 전체를 논리/구조/핵심만 남기고 초압축하라.
모든 중복 제거. 완전 무손실 요약.

${merged}
      `.trim();

      const raw = await runProviderAuto(finalPrompt);
      return toStringSafe(raw);
    }

    return merged.trim();
  },

  // -----------------------------------------------------------
  // 프롬프트 생성
  // -----------------------------------------------------------
  buildPrompt(chunk: string, mode: string): string {
    if (mode === "logic") {
      return `
다음 텍스트에서 핵심 논리·근거·구조만 추출해 사고(Mindmap)형 형태로 요약하라.
불필요한 문장 제거. 핵심 논리와 흐름만 남겨라.

텍스트:
${chunk}
      `.trim();
    }

    if (mode === "ultra") {
      return `
다음 텍스트를 최대한 짧게, 그러나 정보 손실 없이 완전 압축하라.
중복 완전 제거. 핵심 요소만 남겨라.

텍스트:
${chunk}
      `.trim();
    }

    return `
아래 텍스트를 100% 무손실 요약하라.
핵심/논리/정보를 모두 유지하고 불필요한 부분만 제거하라.

텍스트:
${chunk}
    `.trim();
  },
};
