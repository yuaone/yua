// src/ai/capability/vision-engine.ts

import { CapabilityEngine, CapabilityResult } from "./capability-engine";
import { feedbackFromCapability } from "../judgment/judgment-hook";
import type { PathType } from "../../routes/path-router";
import {
  OpenAIVisionProvider,
} from "../vision/openai-vision.provider";
import type { VisionTaskType } from "../vision/openai-vision.provider";

/* -------------------------------------------------- */
/* Input                                              */
/* -------------------------------------------------- */

export interface VisionInput {
  imageBuffer: Buffer;
  mimeType: string;

  originalInput: string;
  path: PathType;
  instanceId: string;
}

/* -------------------------------------------------- */
/* Engine                                             */
/* -------------------------------------------------- */

export class VisionEngine
  implements CapabilityEngine<VisionInput, string>
{
  async execute(
    input: VisionInput
  ): Promise<CapabilityResult<string>> {
    const start = Date.now();

    /* -------------------------------------------------- */
    /* Path → Vision Tasks Mapping (SSOT)                 */
    /* -------------------------------------------------- */

    let tasks: VisionTaskType[] = [];

    switch (input.path) {
      case "FAST":
        tasks = ["ocr", "risk"];
        break;

      case "DEEP":
        tasks = ["ocr", "caption", "scene", "risk"];
        break;

      default:
        // NORMAL
        tasks = ["ocr", "caption", "scene"];
        break;
    }

    /* -------------------------------------------------- */
    /* Provider Call                                     */
    /* -------------------------------------------------- */

    const result = await OpenAIVisionProvider.analyze({
      imageBuffer: input.imageBuffer,
      mimeType: input.mimeType,
      tasks,
      pathMode: input.path === "DEEP" ? "DEEP" : "NORMAL",
    });

    /* -------------------------------------------------- */
    /* Failure → Capability Result                       */
    /* -------------------------------------------------- */

    if (!result.success || !result.contextText) {
      feedbackFromCapability({
        instanceId: input.instanceId,
        input: input.originalInput,
        path: input.path,
        confidence: result.confidence ?? 0,
        reason: result.failureCode ?? "vision_failed",
        stage: "vision",
      });

      return {
        output: "",
        confidence: result.confidence ?? 0,
        meta: {
          engine: "VisionEngine",
          stage: "vision",
          latencyMs: Date.now() - start,
          success: false,
        },
      };
    }

    /* -------------------------------------------------- */
    /* Success → Judgment Feedback                       */
    /* -------------------------------------------------- */

    feedbackFromCapability({
      instanceId: input.instanceId,
      input: input.originalInput,
      path: input.path,
      confidence: result.confidence,
      reason: "vision_success",
      stage: "vision",
    });

    /* -------------------------------------------------- */
    /* Capability Result                                 */
    /* -------------------------------------------------- */

    return {
      output: result.contextText,
      confidence: result.confidence,
      meta: {
        engine: "VisionEngine",
        stage: "vision",
        latencyMs: Date.now() - start,
        success: true,
      },
    };
  }
}
