// 📂 src/ai/persona/persona-inference-engine.ts
// 🔥 PHASE 8-8 Persona Inference Engine (SSOT)

import type { FlowAnchor } from "../reasoning/reasoning-engine";

export type Persona =
  | "developer"
  | "designer"
  | "planner"
  | "executor"
  | "explorer"
  | "unknown";

export type PersonaHint = {
  persona: Persona;
  confidence: number; // 0~1
};

export function inferPersonaFromAnchors(
  anchors: FlowAnchor[],
  confidence: number
): PersonaHint {
  if (anchors.length === 0) {
    return { persona: "unknown", confidence: 0 };
  }

  const score: Record<Persona, number> = {
    developer: 0,
    designer: 0,
    planner: 0,
    executor: 0,
    explorer: 0,
    unknown: 0,
  };

  for (const a of anchors) {
    switch (a) {
      case "VERIFY_LOGIC":
      case "REFINE_INPUT":
        score.developer += 1;
        break;

      case "IMPLEMENT":
      case "NEXT_STEP":
        score.executor += 1;
        break;

      case "COMPARE_APPROACH":
      case "SUMMARIZE":
        score.planner += 1;
        break;

      case "EXPAND_SCOPE":
        score.explorer += 1;
        break;
    }
  }

  const entries = Object.entries(score) as [Persona, number][];
  entries.sort((a, b) => b[1] - a[1]);

  const [topPersona, topScore] = entries[0];
  const total = entries.reduce((s, [, v]) => s + v, 0);

  if (topScore === 0 || total === 0) {
    return { persona: "unknown", confidence: 0 };
  }

  return {
    persona: topPersona,
    confidence: Math.min(1, topScore / total),
  };
}
