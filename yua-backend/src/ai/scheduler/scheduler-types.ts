// 📂 src/ai/scheduler/scheduler-types.ts

import { CodeASTFeatures } from "../capability/code/code-ast-types";
import { MathGraphFeatures } from "../capability/math/math-graph-types";
import { PathType } from "../../routes/path-router";

export interface ReasoningLoadVector {
  code?: CodeASTFeatures;
  math?: MathGraphFeatures;
  basePath: PathType;
  intent?: "ask" | "design" | "debug" | "decide" | "execute";
  depthHint?: "shallow" | "normal" | "deep";
}

export interface ScheduleResult {
  finalPath: PathType;
  requiresGPU: boolean;
  priority: "LOW" | "NORMAL" | "HIGH";
}
