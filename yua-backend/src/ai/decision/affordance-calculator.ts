import type { ReasoningResult } from "../reasoning/reasoning-engine";
import type { ResponseAffordanceVector } from "./response-affordance";

/**
 * 🔒 SSOT
 * - affordance는 "결정 신호"이지 규칙이 아니다
 * - 모든 값은 0~1 로 정규화
 * - Chat / Context / Prompt는 해석만 수행
 */

/* -------------------------------------------------- */
/* 🔢 Utils                                           */
/* -------------------------------------------------- */

// cosine ease (0~1 → 0~1)
function cosineEase(x: number): number {
  const v = Math.min(1, Math.max(0, x));
  return 0.5 - 0.5 * Math.cos(Math.PI * v);
}

// exponential decay (피로/소모)
function decay(x: number, rate = 0.2): number {
  return Math.exp(-rate * Math.max(0, x));
}

// clamp
function clamp(x: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, x));
}

// cosine similarity (vector direction)
function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((s, v, i) => s + v * b[i], 0);
  const magA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
  const magB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}

/* -------------------------------------------------- */
/* 🔥 Affordance Calculator (GPT-style)               */
/* -------------------------------------------------- */

export function computeResponseAffordance(params: {
  reasoning: ReasoningResult;
  turnIntent: "QUESTION" | "CONTINUATION" | "SHIFT";
  anchorConfidence: number;
  continuityAllowed?: boolean; // 🔥 ADD
  prevAffordance?: ResponseAffordanceVector; // 🔥 NEW (optional)
}): ResponseAffordanceVector {
  const {
    reasoning,
    turnIntent,
    anchorConfidence,
    continuityAllowed,
    prevAffordance,
  } = params;

  const { confidence, userStage, depthHint } = reasoning;
  

  /* ---------------------------------- */
  /* 0️⃣ Base confidence (과확신 방지)   */
  /* ---------------------------------- */
  const c = clamp(confidence, 0, 0.85);

  /* ---------------------------------- */
  /* 1️⃣ Stage / Intent bias             */
  /* ---------------------------------- */
  const stageTrend =
    userStage === "looping"
      ? 1.0
      : userStage === "ready"
      ? 0.6
      : 0.8; // confused

  const intentBias =
    turnIntent === "CONTINUATION"
      ? 1.0
      : turnIntent === "QUESTION"
      ? 0.8
      : 0.3;

  const depthDecay =
    depthHint === "deep"
      ? decay(1, 0.4)
      : depthHint === "normal"
      ? decay(1, 0.25)
      : 1;

  /* ---------------------------------- */
  /* 2️⃣ Raw affordance (snapshot)       */
  /* ---------------------------------- */

  const raw: ResponseAffordanceVector = {
    describe: clamp(
      cosineEase(0.45 + c * 0.6) *
        stageTrend *
        intentBias
    ),

    expand: clamp(
      cosineEase(
        c * stageTrend +
          (anchorConfidence >= 0.4 ? 0.25 : 0)
      ) * depthDecay
    ),

    branch: clamp(
      cosineEase(anchorConfidence) *
        (userStage === "looping" ? 1 : 0.7)
    ),

    clarify: clamp(
      userStage === "confused"
        ? cosineEase(1 - c) * 0.45   // ❗ 강력 너프
        : 0.04
    ),

    conclude: clamp(
      userStage === "ready"
        ? cosineEase(c) * 0.9
        : 0.15
    ),
  };

 /* ---------------------------------- */
  /* 🔒 CONTINUATION HARD GUARD (SSOT)   */
  /* ---------------------------------- */
  if (turnIntent === "CONTINUATION") {
    // ❗ continuation은 확장이지 재질문이 아니다
    raw.clarify = Math.min(raw.clarify, 0.03);
    raw.expand = Math.max(raw.expand, 0.55);
  }

  // 🔒 ContextRuntime 판결 존중
  if (continuityAllowed === false) {
    raw.expand = raw.expand * 0.6;
    raw.branch = raw.branch * 0.5;
  }

  // 🔥 Trend / Direction correction (thread continuity)
  if (prevAffordance) {
    const prevVec = Object.values(prevAffordance);
    const currVec = Object.values(raw);

    const similarity = cosineSimilarity(prevVec, currVec);

    console.log("[AFFORDANCE][TREND]", {
      similarity,
      prev: prevAffordance,
      curr: raw,
    });

    if (similarity >= 0.85) {
      raw.expand = clamp(raw.expand + 0.12);
      raw.branch = clamp(raw.branch + 0.1);
    }

    if (similarity <= 0.4) {
      raw.conclude = Math.min(raw.conclude, 0.2);
    }

    raw.clarify = clamp(
      raw.clarify * 0.65 +
        prevAffordance.clarify * 0.35
    );
  }

  /* ---------------------------------- */
  /* 4️⃣ Final normalize                 */
  /* ---------------------------------- */

  return {
    describe: clamp(raw.describe),
    expand: clamp(raw.expand),
    branch: clamp(raw.branch),
    clarify: clamp(raw.clarify),
    conclude: clamp(raw.conclude),
  };
}
