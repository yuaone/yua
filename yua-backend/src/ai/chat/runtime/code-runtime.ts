// 📂 src/ai/runtime/code-runtime.ts
// 🔒 CodeRuntime — SSOT FINAL
// 책임:
// - 검증된 Code Context를 기반으로
// - 설명/수정/생성 "결과물"만 반환
//
// 금지:
// - OpenAI 호출 ❌
// - 스트림 ❌
// - 판단 ❌

import type { ExecutionRuntimeResult } from "../../execution/execution-router";

type CodeRuntimeMode =
  | "REVIEW"
  | "TYPE_FIX"
  | "RUNTIME_FIX"
  | "GENERATE"
  | "REFACTOR";

export const CodeRuntime = {
  run(input: {
    context: unknown;
    mode: CodeRuntimeMode;
  }): ExecutionRuntimeResult {
    const { context, mode } = input;

    try {
      switch (mode) {
        case "REVIEW":
          return {
            ok: true,
            output: {
              kind: "CODE_REVIEW_CONTEXT",
              context,
            },
          };

        case "TYPE_FIX":
          return {
            ok: true,
            output: {
              kind: "TYPE_FIX_CONTEXT",
              context,
            },
          };

        case "RUNTIME_FIX":
          return {
            ok: true,
            output: {
              kind: "RUNTIME_FIX_CONTEXT",
              context,
            },
          };

        case "GENERATE":
          return {
            ok: true,
            output: {
              kind: "CODE_GENERATION_CONTEXT",
              context,
            },
          };

        case "REFACTOR":
          return {
            ok: true,
            output: {
              kind: "REFACTOR_CONTEXT",
              context,
            },
          };

        default: {
          const _exhaustive: never = mode;
          return {
            ok: false,
            error: {
              code: "UNSUPPORTED_CODE_MODE",
              message: `Unsupported code runtime mode`,
              detail: _exhaustive,
            },
          };
        }
      }
    } catch (err) {
      return {
        ok: false,
        error: {
          code: "CODE_RUNTIME_ERROR",
          message: "CodeRuntime execution failed",
          detail: err,
        },
      };
    }
  },
};
