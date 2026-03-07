// 📂 src/ai/code-ingest/structured-code-ingest.ts
// 🔥 StructuredCodeIngest — SAFE LARGE FILE HANDLER (5000+ lines)
// - ``` code block 여러 개 지원
// - 큰 파일이면: index → focusPrompt 생성 (token-safe)
// - 실패/애매하면: full 유지 (SSOT)

import { CodeIndexEngine } from "./code-index-engine";
import { CodeFocusResolver } from "./code-focus-resolver";

export interface StructuredIngestResult {
  fullCode: string; // merged blocks
  focusPrompt: string;
  totalLines: number;
  focusedSymbols: string[];
  strategy: "FULL" | "FOCUSED";
}

const LARGE_FILE_THRESHOLD = 1200; // lines
const MAX_FOCUS_LINES = 900;       // keep prompt under control for 5k lines
const MAX_FOCUS_CHARS = 140_000;

function extractAllCodeBlocks(message: string): string[] {
  const blocks: string[] = [];
  const re = /```([\s\S]*?)```/g;
  let m: RegExpExecArray | null = null;

  while ((m = re.exec(message)) !== null) {
    const body = (m[1] ?? "").trim();
    if (body) blocks.push(body);
  }

  return blocks;
}

export const StructuredCodeIngest = {
  run(input: { message: string }): StructuredIngestResult | null {
    const blocks = extractAllCodeBlocks(input.message);
    if (blocks.length === 0) return null;

    // merge all blocks with separators to preserve boundaries
    const fullCode =
      blocks.length === 1
        ? blocks[0]
        : blocks.map((b, i) => `/* --- CODE BLOCK ${i + 1}/${blocks.length} --- */\n${b}`).join("\n\n");

    const lines = fullCode.split("\n");
    const totalLines = lines.length;

    // small file: keep original message as-is
    if (totalLines < LARGE_FILE_THRESHOLD) {
      return {
        fullCode,
        focusPrompt: input.message,
        totalLines,
        focusedSymbols: [],
        strategy: "FULL",
      };
    }

    const index = CodeIndexEngine.build(fullCode);

    const focus = CodeFocusResolver.resolve({
      code: fullCode,
      index,
      question: input.message,
      maxFocusLines: MAX_FOCUS_LINES,
      maxFocusChars: MAX_FOCUS_CHARS,
    });

    // IMPORTANT:
    // - 질문/요청 텍스트는 유지하되,
    // - 코드 영역은 focus 결과로 대체
    // - 원본 코드 전체를 prompt에 다시 싣지는 않는다(토큰 방어)
    const focusPrompt = `
[STRUCTURED CODE MODE ENABLED]
- Total lines: ${index.totalLines}
- Strategy: ${focus.strategy}
${
  focus.focusedSymbols.length > 0
    ? `- Focused symbols: ${focus.focusedSymbols.join(", ")}`
    : "- Focused symbols: (none detected)"
}

[USER REQUEST]
${input.message.replace(/```[\s\S]*?```/g, "[CODE OMITTED: handled by Structured Code Mode]").trim()}

--- CODE CONTEXT START ---
${focus.focusedCode}
--- CODE CONTEXT END ---

[SSOT GUARDRULE]
- 위 CODE CONTEXT는 원본에서 선택된 일부 구간이다.
- 수정/리팩터/리뷰가 필요하면, 해당 심볼 단위로 정확히 지적하고 변경안을 제시한다.
- 심볼이 누락되었거나 더 많은 범위가 필요하면, 어떤 심볼/구간이 추가로 필요한지 명확히 요청한다.
`.trim();

    return {
      fullCode,
      focusPrompt,
      totalLines: index.totalLines,
      focusedSymbols: focus.focusedSymbols,
      strategy: focus.strategy,
    };
  },
};
