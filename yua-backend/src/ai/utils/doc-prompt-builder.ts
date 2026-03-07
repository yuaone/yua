// 📂 src/ai/utils/doc-prompt-builder.ts
// Document AI 전용 프롬프트 빌더 (채팅 prompt-builder.ts와 분리)

export type DocContext = {
  block_id: string;
  block_type: string;
  content: string;
  score: number;
};

type BuildOpts = {
  mode: "generate" | "rewrite" | "summarize" | "translate" | "chat";
  prompt: string;
  context?: DocContext[];
  docTitle?: string;
  selectionText?: string;
  language?: string;
};

const DOC_GENERATE_SYSTEM = `You are a document writing assistant inside YUA editor.
Rules:
- Write in the same language as the user's prompt.
- Output clean markdown (no code fences wrapping the entire response).
- Be concise and focused on the request.
- Do not add greetings or meta-commentary.
- If context blocks are provided, maintain consistency with them.`;

const DOC_REWRITE_SYSTEM = `You are a document rewriting assistant.
Rules:
- Rewrite the given text as requested by the user.
- Maintain the original meaning unless instructed otherwise.
- Output clean markdown.
- Write in the same language as the original text.`;

const DOC_SUMMARIZE_SYSTEM = `You are a document summarization assistant.
Rules:
- Summarize the provided content concisely.
- Preserve key facts and structure.
- Output clean markdown.
- Write in the same language as the original text.`;

const DOC_TRANSLATE_SYSTEM = `You are a translation assistant.
Rules:
- Translate the given text accurately.
- Preserve formatting and structure.
- Output clean markdown.`;

const DOC_CHAT_SYSTEM = `You are a document Q&A assistant. Answer questions based ONLY on the provided document blocks.

STRICT RULES:
1. 문서 밖 추측 금지. 답을 모르면 "이 문서에는 해당 내용이 없습니다." 라고 답변.
2. 근거는 반드시 block citations으로만. 각 인용에 [block:{block_id}] 마커 포함.
3. 답변에 인용 포함 (블록 링크/하이라이트용).
4. 답변 언어는 질문 언어를 따름.
5. 마크다운 포맷 사용.`;

const SYSTEM_MAP: Record<string, string> = {
  generate: DOC_GENERATE_SYSTEM,
  rewrite: DOC_REWRITE_SYSTEM,
  summarize: DOC_SUMMARIZE_SYSTEM,
  translate: DOC_TRANSLATE_SYSTEM,
  chat: DOC_CHAT_SYSTEM,
};

export function buildDocPrompt(opts: BuildOpts): Array<{ role: string; content: string }> {
  const systemContent = SYSTEM_MAP[opts.mode] || DOC_GENERATE_SYSTEM;

  const messages: Array<{ role: string; content: string }> = [
    { role: "system", content: systemContent },
  ];

  // Context blocks (RAG results for chat, or surrounding blocks for generate)
  if (opts.context && opts.context.length > 0) {
    const contextStr = opts.context
      .map(
        (c) =>
          `[block:${c.block_id}] (${c.block_type}, score: ${c.score.toFixed(3)})\n${c.content}`
      )
      .join("\n\n---\n\n");

    messages.push({
      role: "system",
      content: `CONTEXT BLOCKS:\n\n${contextStr}`,
    });
  }

  // Document title context
  if (opts.docTitle) {
    messages.push({
      role: "system",
      content: `Document title: "${opts.docTitle}"`,
    });
  }

  // Selection text (for rewrite/translate)
  if (opts.selectionText) {
    messages.push({
      role: "user",
      content: `Selected text:\n${opts.selectionText}\n\nRequest: ${opts.prompt}`,
    });
  } else {
    messages.push({
      role: "user",
      content: opts.prompt,
    });
  }

  return messages;
}
