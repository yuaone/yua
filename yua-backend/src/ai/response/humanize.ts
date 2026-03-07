// 📂 src/ai/response/humanize.ts
// 🔒 YUA Humanization Layer — SSOT v1.1 FINAL (EXPANDED)
// -------------------------------------------
// 책임:
// - 기계적 응답을 사람처럼 느껴지게 조정
// - 판단 / 내용 변경 ❌
// - Depth / Mode / Tone만 표현
// - Always Respond 유지
//
// ⚠️ Core / Planner 결과는 절대 변경하지 않는다

import type {
  ResponsePlan,
  ResponseMode,
  ResponseTone,
} from "./response-types";

/* ================================
   Public API
================================ */

export function applyHumanization(
  text: string,
  plan: ResponsePlan,
  memory?: string[]
): string {
  let out = text.trim();

  // 1️⃣ Conversational memory hook
  if (memory && memory.length > 0 && plan.depth >= 2) {
    out = injectMemoryHook(out, memory[0]);
  }

  // 2️⃣ Tone (soft modifier)
  out = applyTone(out, plan.tone);

  // 3️⃣ Mode (strong shaper)
  out = applyMode(out, plan);

  // 4️⃣ Depth-based smoothing
  out = smoothExplanation(out, plan.depth);

  return out.trim();
}

/* ================================
   Core modifiers
================================ */

function injectMemoryHook(
  text: string,
  memorySnippet: string
): string {
  if (!memorySnippet) return text;

  return `아까 이야기한 맥락을 기준으로 보면,\n\n${text}`;
}

function applyTone(
  text: string,
  tone: ResponseTone
): string {
  switch (tone) {
    case "casual":
      return soften(text);

    case "playful":
      return lighten(text);

    case "neutral":
    default:
      return text;
  }
}

function applyMode(
  text: string,
  plan: ResponsePlan
): string {
  const { mode, depth, state } = plan;

  switch (mode) {
    case "ONE_LINER":
      return oneLiner(text);

    case "MEME":
      return meme(text, state);

    case "CASUAL":
      return casual(text, depth);

    case "OBSERVER":
      return observer(text);

    case "CO_PILOT":
      return coPilot(text, depth);

    case "CLEAN_ROOM":
      return clean(text);

    case "DEFAULT":
    default:
      return text;
  }
}

function smoothExplanation(
  text: string,
  depth: number
): string {
  if (depth <= 1) return text;
  return text.replace(/\n{3,}/g, "\n\n");
}

/* ================================
   Tone helpers
================================ */

function soften(text: string): string {
  return text
    .replace(/이다\./g, "인 것 같아.")
    .replace(/다\./g, "다고 볼 수 있어.");
}

function lighten(text: string): string {
  return text.endsWith("🙂") ? text : `${text} 🙂`;
}

/* ================================
   Mode implementations
================================ */

function oneLiner(text: string): string {
  const line = text.split("\n")[0].trim();
  return line.length > 140
    ? line.slice(0, 137) + "…"
    : line;
}

function meme(
  text: string,
  state: ResponsePlan["state"]
): string {
  const base = oneLiner(text);

  if (state === "BLOCK") {
    return `${base} (이건 좀 선 넘음 😅)`;
  }

  if (state === "UNCERTAIN") {
    return `${base} (여기서 갈림 🤔)`;
  }

  return `${base} (ㄹㅇ)`;
}

function casual(
  text: string,
  depth: number
): string {
  if (depth === 0) {
    return `음… ${text}`;
  }

  return `내 생각엔,\n\n${text}`;
}

function observer(text: string): string {
  return (
    "한 발 떨어져서 보면 이렇게 정리돼.\n\n" +
    text
  );
}

function coPilot(
  text: string,
  depth: number
): string {
  if (depth <= 1) {
    return `같이 보면, ${text}`;
  }

  return (
    "내가 옆에서 정리해주는 느낌으로 말해볼게.\n\n" +
    text
  );
}

function clean(text: string): string {
  return text
    .replace(/🙂/g, "")
    .replace(/\s*\(.*?\)$/g, "")
    .replace(/!+/g, ".");
}
