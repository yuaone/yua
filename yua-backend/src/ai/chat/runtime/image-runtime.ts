// 📂 src/ai/runtime/image-runtime.ts
// 🔒 ImageRuntime — SSOT FINAL
// 책임:
// - ImageObserver 관측 결과 전달 ONLY
//
// 금지:
// - 추론 ❌
// - 해석 ❌
// - 상상 ❌
// - LLM 호출 ❌

import type { ExecutionRuntimeResult } from "../../execution/execution-router";

export const ImageRuntime = {
  run(input: {
    observation: unknown;
  }): ExecutionRuntimeResult {
    try {
      return {
        ok: true,
        output: {
          observation: input.observation,
          note: "이미지에서 관측된 내용만 포함됨",
        },
      };
    } catch (err) {
      return {
        ok: false,
        error: {
          code: "IMAGE_RUNTIME_ERROR",
          message: "Failed to process image observation",
          detail: err,
        },
      };
    }
  },
};
