// src/ai/capability/generation-engine.ts

import { CapabilityEngine, CapabilityResult } from "./capability-engine";
import { feedbackFromCapability } from "../judgment/judgment-hook";
import type { PathType } from "../../routes/path-router";

export interface GenerationInput {
  prompt: string;
  tone?: "neutral" | "formal" | "casual";

  originalInput: string;
  path: PathType;
  instanceId: string;
}

export class GenerationEngine
  implements CapabilityEngine<GenerationInput, string>
{
  async execute(
    input: GenerationInput
  ): Promise<CapabilityResult<string>> {
    const start = Date.now();

    // --------------------------------------------------
    // 🧠 실제 baseline 생성 (LLM 이전 단계)
    // --------------------------------------------------
    const output = input.prompt;

    // --------------------------------------------------
    // 📊 Confidence 계산
    // --------------------------------------------------
    const overlap =
      input.originalInput.length > 0
        ? output.includes(input.originalInput.slice(0, 20))
        : false;

    const lengthScore =
      output.length < 30 ? 0.6 :
      output.length < 80 ? 0.75 :
      1.0;

    const confidence = Number(
      (0.5 * lengthScore + (overlap ? 0.4 : 0.2)).toFixed(2)
    );

    // --------------------------------------------------
    // 🔁 Judgment Feedback
    // --------------------------------------------------
    feedbackFromCapability({
      instanceId: input.instanceId,
      input: input.originalInput,
      path: input.path,
      confidence,
      reason: "generation_output",
      stage: "capability",
    });

    return {
      output,
      confidence,
      meta: {
        engine: "GenerationEngine",
        stage: "generation",
        latencyMs: Date.now() - start,
        success: true,
      },
    };
  }
}
