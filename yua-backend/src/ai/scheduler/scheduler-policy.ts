  // 🔒 Scheduler Policy — SSOT CORE
  // -----------------------------------------
  // 원칙:
  // - basePath를 존중한다
  // - Scheduler는 "증폭"만 가능
  // - QUESTION / 단문 질의에서 DEEP 승격 ❌
  // -----------------------------------------

  import { ReasoningLoadVector } from "./scheduler-types";
  import type { PathType } from "../../routes/path-router";

  type Priority = "LOW" | "NORMAL" | "HIGH";

    function escalatePath(
      base: PathType,
      next: PathType
    ): PathType {
      const order: PathType[] = ["FAST", "NORMAL", "DEEP", "BENCH"];
      return order.indexOf(next) > order.indexOf(base)
        ? next
        : base;
    }

  export function evaluatePolicies(
    v: ReasoningLoadVector
  ): {
    path: PathType;
    requiresGPU: boolean;
    priority: Priority;
  } {
    let path: PathType = v.basePath ?? "NORMAL";
    let priority: Priority = "NORMAL";

    if (v.code) {
      const canEscalate =
        v.intent !== "ask" &&
        v.depthHint !== "shallow";

      if (
        canEscalate &&
        v.code.maxDepth !== undefined &&
        v.code.maxDepth > 12
      ) {
        path = "DEEP";
      }

      if (
        v.code.mutationScore !== undefined &&
        v.code.mutationScore > 0.7
      ) {
        path = "DEEP";
      }

      if (v.code.hasPrivilegeKeyword === true) {
        priority = "HIGH";
      }
    }

    if (v.math) {
      if (
        v.math.symbolicDensity !== undefined &&
        v.math.symbolicDensity > 0.8
      ) {
        path = "DEEP";
      }

      if (v.math.isProofLike === true) {
        path = "BENCH";
      }
    }

    const finalPath = escalatePath(v.basePath, path);

    return {
      path: finalPath,
      requiresGPU: finalPath === "DEEP",
      priority,
    };
  }
