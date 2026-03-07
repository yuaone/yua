// 📂 src/ai/utils/prompt-builder-deep.ts
// 🧠 YUA PromptBuilderDeep — DEEP REASONING (SSOT 2026.01)
// -----------------------------------------------------------------------------
// ✔ 사고 강제 ❌
// ✔ 자연어 설명 우선
// ✔ 깊이 = 허용량, 구조 = 선택
// ✔ GPT / Gemini 스타일 DEEP 지향
// -----------------------------------------------------------------------------

import { sanitizeContent } from "./sanitizer";
import {
  PROTOCOL_SPECS,
  type ProtocolSpec,
  type ThinkingDepth,
} from "../prompt/protocols/protocol-specs";

/* -------------------------------------------------------------------------- */
/* TYPES                                                                       */
/* -------------------------------------------------------------------------- */

export type DeepThinkingProtocol =
  | "ENGINEERING_DESIGN"
  | "SYSTEM_ARCHITECTURE"
  | "PRODUCT_DECISION"
  | "RESEARCH_REASONING"
  | "THEOREM_ANALYSIS";

export interface PromptBuilderDeepInput {
  message: string;
  protocol?: DeepThinkingProtocol;
  depth?: ThinkingDepth;
  trustedFacts?: string[];
  researchContext?: string;
  ssot?: boolean;
}

/* -------------------------------------------------------------------------- */
/* CONTEXT HELPERS (HINT ONLY, NO FORCE)                                       */
/* -------------------------------------------------------------------------- */

function buildThinkingContext(protocol?: DeepThinkingProtocol): string {
  if (!protocol) return "";

  switch (protocol) {
    case "ENGINEERING_DESIGN":
      return `
[THINKING CONTEXT]
This question may benefit from practical engineering reasoning.
Consider feasibility, constraints, and real-world trade-offs if relevant.
`.trim();

    case "SYSTEM_ARCHITECTURE":
      return `
[THINKING CONTEXT]
This topic may involve system-level structure.
You may consider component boundaries, responsibilities, and data flow if helpful.
`.trim();

    case "PRODUCT_DECISION":
      return `
[THINKING CONTEXT]
This appears to be a decision-oriented question.
User value, constraints, and alternatives may be useful lenses.
`.trim();

    case "RESEARCH_REASONING":
      return `
[THINKING CONTEXT]
This topic may involve research-style reasoning.
Facts, assumptions, and uncertainty can be distinguished if helpful.
`.trim();

    case "THEOREM_ANALYSIS":
      return `
[THINKING CONTEXT]
This question may involve formal or logical analysis.
Clear definitions and careful reasoning could be useful.
`.trim();

    default:
      return "";
  }
}

function buildDepthHint(depth?: ThinkingDepth): string {
  if (!depth) return "";

  switch (depth) {
   case "LIGHT":
      return `
[DEPTH HINT]
A light but useful explanation is sufficient.
Cover the core idea and 1–2 key points; avoid abrupt one-liners.
`.trim();
    case "FORMAL":
      return `
[DEPTH HINT]
You may reason carefully and precisely before answering.
`.trim();

    case "DENSE":
      return `
[DEPTH HINT]
You may focus on the key decision points and trade-offs.
`.trim();

    case "STANDARD":
    default:
      return `
[DEPTH HINT]
A thorough but practical explanation is sufficient.
`.trim();
  }
}

/* -------------------------------------------------------------------------- */
/* 🌊 DEEP FLOW CONTRACT (Natural Deep Rhythm)                               */
/* - 사고는 깊게 허용하되, 강의식 전개 금지                                     */
/* -------------------------------------------------------------------------- */
function buildDeepFlowContract(): string {
  return `
[DEEP FLOW CONTRACT]
- 설명은 다음 자연스러운 흐름을 따른다:
  1) 문제의 성격을 한 문장으로 재정의
  2) 핵심 쟁점 2~3개를 순차적으로 풀어간다
  3) 각 쟁점은 연결 문장으로 이어진다 (점프 금지)
  4) 마지막에는 판단 또는 통찰을 명확히 제시한다

- 번호를 기계적으로 나열하지 않는다.
- "정리하면", "결론적으로" 같은 반복 패턴을 남발하지 않는다.
- 사고 과정을 드러내되, 체크리스트처럼 보이지 않게 작성한다.
- 사고는 자연어 설명 형태로 풀어낸다.
`.trim();
}

/* -------------------------------------------------------------------------- */
/* PROTOCOL GUIDANCE (SOFT, NO FORCE)                                         */
/* -------------------------------------------------------------------------- */
function buildProtocolGuidance(spec: ProtocolSpec): string {
  const parts: string[] = [];

  // NOTE: These blocks are for internal guidance only.
  // The model should NOT mirror these headings in the final answer unless structure genuinely helps.

  if (spec.suggestedConsiderations?.length) {
    parts.push(
      `[SUGGESTED CONSIDERATIONS]\n` +
        spec.suggestedConsiderations.map((s) => `- ${s}`).join("\n")
    );
  }

  if (spec.emphasis?.length) {
    parts.push(
      `[EMPHASIS]\n` + spec.emphasis.map((s) => `- ${s}`).join("\n")
    );
  }

  if (spec.discouragedPatterns?.length) {
    parts.push(
      `[DISCOURAGED PATTERNS]\n` +
        spec.discouragedPatterns.map((s) => `- ${s}`).join("\n") +
        `\n(These are warnings, not hard bans.)`
    );
  }

  if (spec.fallbackStrategy) {
    parts.push(
      `[IF STUCK]\n- Preferred fallback: ${spec.fallbackStrategy}`
    );
  }

  return parts.length ? parts.join("\n\n") : "";
}

/* -------------------------------------------------------------------------- */
/* OPTIONAL CONTEXT BLOCKS                                                     */
/* -------------------------------------------------------------------------- */

function buildTrustedFactsBlock(facts?: string[]): string {
  if (!facts || facts.length === 0) return "";

  return `
[REFERENCE FACTS]
The following items are reliable facts to ground your answer.
Use them as constraints if relevant, but do not treat them as a final conclusion by themselves.

${facts.join("\n\n")}
`.trim();
}

function buildResearchContextBlock(researchContext?: string): string {
  if (!researchContext) return "";

  return `
[CONTEXT GUIDANCE]
The following context reflects prior discussion or constraints.
Use it only to maintain consistency.
Do NOT treat it as a conclusion or a solved decision.

${researchContext.slice(0, 1200)}
`.trim();
}

/* -------------------------------------------------------------------------- */
/* MAIN BUILDER                                                               */
/* -------------------------------------------------------------------------- */

export const PromptBuilderDeep = {
  build(args: PromptBuilderDeepInput): string {
    const clean = sanitizeContent(args.message);

    const protocolSpec: ProtocolSpec =
      args.protocol && PROTOCOL_SPECS[args.protocol]
        ? PROTOCOL_SPECS[args.protocol]
        : PROTOCOL_SPECS.GENERAL_REASONING;

    const effectiveDepth: ThinkingDepth =
      args.depth ?? protocolSpec.depthBias;

    const thinkingContext = buildThinkingContext(args.protocol);
    const depthHint = buildDepthHint(effectiveDepth);
    const protocolGuidance = buildProtocolGuidance(protocolSpec);
    const deepFlowContract = buildDeepFlowContract();
    const trustedFactsBlock = buildTrustedFactsBlock(args.trustedFacts);
    const researchBlock = buildResearchContextBlock(args.researchContext);

     return `
${thinkingContext}

${depthHint}
${protocolGuidance}
${deepFlowContract}
${trustedFactsBlock}

${researchBlock}

[USER QUESTION]
${clean}

[RESPONSE GUIDANCE]
- Explain naturally, as if speaking to an informed human.
- Use structure only if it genuinely helps clarity.
- Do not echo the protocol headings/checklists verbatim in the final answer.
- Avoid repeating points unnecessarily.
- Stop after covering the core reasoning or explanation (but avoid abrupt one-liners).
- Do NOT assume any UI state, stages, or control signals.
- End decisively when the explanation is complete.
`.trim();
  },
};
