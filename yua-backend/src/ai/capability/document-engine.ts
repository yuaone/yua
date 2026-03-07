// src/ai/capability/document-engine.ts

import { CapabilityEngine, CapabilityResult } from "./capability-engine";
import { feedbackFromCapability } from "../judgment/judgment-hook";
import type { PathType } from "../../routes/path-router";

export interface DocumentInput {
  text: string;
  mode: "summary" | "extract" | "rewrite";

  originalInput: string;
  path: PathType;
  instanceId: string;
}

export class DocumentEngine
  implements CapabilityEngine<DocumentInput, string>
{
  async execute(
    input: DocumentInput
  ): Promise<CapabilityResult<string>> {
    const start = Date.now();

    // --------------------------------------------------
    // 📄 실제 문서 처리 (rule-based baseline)
    // --------------------------------------------------
    const trimmed = input.text.trim();
    const sliceLen =
      input.mode === "summary" ? 300 :
      input.mode === "extract" ? 500 :
      trimmed.length;

    const output =
      input.mode === "rewrite"
        ? trimmed
        : trimmed.slice(0, sliceLen);

    // --------------------------------------------------
    // 📊 Confidence 계산 (mock 아님)
    // --------------------------------------------------
    const coverageRatio =
      Math.min(output.length / Math.max(trimmed.length, 1), 1);

    const lengthPenalty =
      trimmed.length < 50 ? 0.6 :
      trimmed.length < 120 ? 0.75 :
      1.0;

    const modePenalty =
      input.mode === "summary" && trimmed.length < 80
        ? 0.7
        : 1.0;

    const confidence = Number(
      (0.5 * coverageRatio * lengthPenalty * modePenalty + 0.3).toFixed(2)
    );

    // --------------------------------------------------
    // 🔁 Judgment Feedback
    // --------------------------------------------------
    feedbackFromCapability({
      instanceId: input.instanceId,
      input: input.originalInput,
      path: input.path,
      confidence,
      reason: `document_${input.mode}`,
      stage: "capability",
    });

    return {
      output,
      confidence,
      meta: {
        engine: "DocumentEngine",
        stage: "document",
        latencyMs: Date.now() - start,
        success: true,
      },
    };
  }
}
