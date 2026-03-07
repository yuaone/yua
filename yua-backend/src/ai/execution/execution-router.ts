// 📂 src/ai/execution/execution-router.ts
// 🔒 EXECUTION ROUTER — SSOT FINAL (ASYNC CONSISTENT)

import type { ExecutionPlan } from "./execution-plan";
import type { ChatRuntimeInput } from "../chat/runtime/chat-runtime";

/* -------------------------------------------------- */
/* Runtime Result (Unified)                           */
/* -------------------------------------------------- */

export type ExecutionRuntimeResult =
  | {
      ok: true;
      output: unknown;
    }
  | {
      ok: false;
      error: {
        code: string;
        message: string;
        detail?: unknown;
      };
    };

/* -------------------------------------------------- */
/* Runtime Interfaces (ALL ASYNC)                     */
/* -------------------------------------------------- */

export interface ImageRuntime {
  run(input: { observation: unknown }): ExecutionRuntimeResult;
}

export interface CodeRuntime {
  run(input: {
    context: unknown;
    mode:
      | "REVIEW"
      | "TYPE_FIX"
      | "RUNTIME_FIX"
      | "GENERATE"
      | "REFACTOR";
  }): ExecutionRuntimeResult;
}

export interface ChatRuntime {
  run(input: ChatRuntimeInput): Promise<ExecutionRuntimeResult>;
}

/* -------------------------------------------------- */
/* Router Deps                                        */
/* -------------------------------------------------- */

export interface ExecutionRouterDeps {
  imageRuntime: ImageRuntime;
  codeRuntime: CodeRuntime;
  chatRuntime: ChatRuntime;
}

/* -------------------------------------------------- */
/* Router (ASYNC)                                     */
/* -------------------------------------------------- */

export async function routeExecution(
  plan: ExecutionPlan,
  deps: ExecutionRouterDeps,
  ctx?: {
    chatRuntimeInput?: ChatRuntimeInput;
  }
): Promise<ExecutionRuntimeResult> {
  switch (plan.task) {
    case "FILE_ANALYSIS":
    case "TABLE_EXTRACTION":
    case "DATA_TRANSFORM":
    case "FILE_INTELLIGENCE":
      return {
        ok: true,
        output: null,
      };

    case "IMAGE_ANALYSIS":
      return await deps.imageRuntime.run({
        observation: plan.payload.observation,
      });

    case "IMAGE_GENERATION":
      return {
        ok: true,
        output: null,
      };

    case "CODE_REVIEW":
      return await deps.codeRuntime.run({
        context: plan.payload.verifiedContext,
        mode: "REVIEW",
      });

    case "TYPE_ERROR_FIX":
      return await deps.codeRuntime.run({
        context: plan.payload.verifiedContext,
        mode: "TYPE_FIX",
      });

    case "RUNTIME_ERROR_FIX":
      return await deps.codeRuntime.run({
        context: plan.payload.verifiedContext,
        mode: "RUNTIME_FIX",
      });

    case "CODE_GENERATION":
      return await deps.codeRuntime.run({
        context: plan.payload.codeContext,
        mode: "GENERATE",
      });

    case "REFACTOR":
      return await deps.codeRuntime.run({
        context: plan.payload.codeContext,
        mode: "REFACTOR",
      });

    case "DIRECT_CHAT":
    case "SEARCH":
    case "SEARCH_VERIFY":
      case "DIRECT_URL_FETCH":
      return {
        ok: true,
        output: null,
      };
    }
  // 🔒 exhaustive safety
  const _exhaustive: never = plan;
  return _exhaustive;
}
