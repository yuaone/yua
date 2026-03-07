// src/ai/yua/yua-spine-runner.ts
// -------------------------------------------------------------
// ⚡ YUA-AI Spine Runner v4.1 — Typed SpineInput + Backward Compatible
// -------------------------------------------------------------

import { yuaSpine } from "./yua-spine";
import { logger } from "../../utils/logger";
import type { SpineInput } from "./yua-spine";
import type { PathType } from "../../routes/path-router";

export type RunnerInput =
  | string
  | (Omit<SpineInput, "text"> & { text: string });

export class YuaSpineRunner {
  constructor() {}

  // -------------------------------------------------------------
  // Internal: normalize input (backward compatible)
  // -------------------------------------------------------------
  private normalize(input: RunnerInput): SpineInput {
    if (typeof input === "string") {
      // ✅ 기존 호출 호환: stream("hi"), execute("hi")
      // path는 Spine 계약상 필수이므로 기본값 제공
      return {
        text: input,
        path: "general" as PathType,
      };
    }

    // ✅ 신규 호출 지원: stream({text, path, userId...})
    return {
      text: input.text,
      path: input.path ?? ("general" as PathType),
      prevState: input.prevState,
      userId: input.userId,
      instanceId: input.instanceId,
    };
  }

  // -------------------------------------------------------------
  // STREAMING MODE — Async Generator
  // -------------------------------------------------------------
  async *stream(input: RunnerInput) {
    const spineInput = this.normalize(input);

    try {
      for await (const chunk of yuaSpine.runStream(spineInput)) {
        yield chunk;
      }
    } catch (err) {
      logger.error("[Runner.stream] failed:", err);
      yield {
        stage: "runner-error",
        timestamp: Date.now(),
        output: { error: true, message: String(err) },
      };
    }
  }

  // -------------------------------------------------------------
  // FINAL OUTPUT MODE — SUV + MemoryEngine.store()
  // -------------------------------------------------------------
  async execute(input: RunnerInput) {
    const spineInput = this.normalize(input);

    try {
      const result = await yuaSpine.run(spineInput);
      return result;
    } catch (err) {
      logger.error("[Runner.execute] failed:", err);
      return {
        finalText: spineInput.text,
        stateVector: [],
        stability: 0,
        memoryAdded: { ok: false, reason: "runner_failed" },
        details: [],
        error: String(err),
      };
    }
  }
}

export const yuaSpineRunner = new YuaSpineRunner();
export default yuaSpineRunner;
