// 📂 src/ai/execution/continuation-prompt.ts
// 🔥 YUA Continuation Prompt Builder — SSOT FINAL (PHASE 4 → 5 READY)
//
// 책임:
// - 연속 응답(segment)용 continuation 프롬프트 생성
// - 이전 출력 반복 방지
// - tone / depth / 구조 유지 강제 (계약 자체는 다루지 않음)
//
// ❌ ResponsePlan 생성 ❌
// ❌ ResponseContract 직렬화 ❌
// ❌ Stream / DONE 판단 ❌
//
// 이 파일은 "이어 말하기"만 책임진다.

import { OUTMODE } from "../chat/types/outmode";

/* ==================================================
   Types
================================================== */

export interface ContinuationPromptInput {
  originalPrompt: string;
  segmentIndex: number;
  mode: string; // FAST | NORMAL | SEARCH | DEEP ...
  outmode?: OUTMODE;
  /**
   * ✅ SSOT: continuation은 "직전 출력"이 없으면 불가능하다.
   * - fullAnswer의 tail(마지막 N자)만 전달
   * - 전체 답변을 다시 넣지 말 것(토큰 폭발/중복 위험)
   */
  previousAnswerTail?: string;
  /** Essential context (memory, constraints) carried across continuation segments */
  contextSummary?: string;
}

/* ==================================================
   Builder
================================================== */

export function buildContinuationPrompt(
  input: ContinuationPromptInput
): string {
  const { originalPrompt, segmentIndex, mode, outmode, previousAnswerTail, contextSummary } = input;

  const isDeep = mode === "DEEP";

  /* -------------------------------------------
     1️⃣ Continuation Rules
     - “어떻게 이어 말할지”
  ------------------------------------------- */
  const continuationRules = isDeep
    ? `
[CONTINUATION — DEEP]
- Continue directly from where you stopped.
- Do NOT repeat or restart.
- Keep the same depth and reasoning.
- You may speak naturally, as if continuing the same explanation.
- Preserve equations, definitions, and structure.
- If the answer finishes here, end naturally without announcing it.
`.trim()
    : `
[CONTINUATION]
- Do NOT repeat previous content
- Continue naturally from the last unfinished point
- Maintain the same tone, structure, and depth
- Continue ONLY if the previous output was cut off mid-explanation
- Do NOT conclude, summarize, or finalize the answer
- Do NOT ask questions or propose next steps
- Do NOT introduce new sections or ideas
`.trim();

  /* -------------------------------------------
     2️⃣ Segment Guard
     - 무한 루프 / 재시작 방지
  ------------------------------------------- */
  const segmentGuard = `
[CONTINUATION CONSTRAINTS]
- This is continuation segment #${segmentIndex}.
- Never restart or restate earlier parts.
- If the answer is already complete, output nothing.
- If the previous output ended with a question or proposal, output NOTHING.
- Do not add filler or meta commentary.
`.trim();

  /* -------------------------------------------
     4️⃣ Anchor: Previous Answer Tail (SSOT)
     - continuation 기준점(필수)
  ------------------------------------------- */
  const tailBlock = (previousAnswerTail && previousAnswerTail.trim())
    ? `
[PREVIOUS ASSISTANT OUTPUT — TAIL ONLY]
${previousAnswerTail.trim()}
`.trim()
    : `
[PREVIOUS ASSISTANT OUTPUT — MISSING]
- You do not have the previous output context.
- In this case, output NOTHING. (Do not restart, do not re-answer.)
`.trim();


  /* -------------------------------------------
     4️⃣-1️⃣ Active Context (memory, constraints)
     - continuation 세그먼트 간 맥락 유지
  ------------------------------------------- */
  const contextBlock = contextSummary
    ? `\n[ACTIVE CONTEXT]\n${contextSummary}\n`
    : "";

  /* -------------------------------------------
     5️⃣ Final Prompt Assembly
  ------------------------------------------- */
  return `

${continuationRules}

${segmentGuard}

${tailBlock}
${contextBlock}
[ORIGINAL USER REQUEST — CONTEXT ONLY]
- This is provided for reference only
- Do NOT re-analyze or reinterpret this request
- Continue the existing answer ONLY
${originalPrompt}

[INSTRUCTION]
Continue naturally from the exact point after the provided tail.
Do not repeat earlier content.
`.trim();
}
