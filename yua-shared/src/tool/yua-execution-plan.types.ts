import { YuaExecutionTask } from "./yua-tool.types";

export type YuaExecutionPlan = {
  task: YuaExecutionTask;
  confidence: number;
  payload: Record<string, unknown>;
  nextAction?: "GENERATE_ASSET" | "COMPOSE_REPORT" | "ANSWER_ONLY";
  uxHint?: string;
  refs?: {
    fileIds?: string[];
    toolRunIds?: string[];
  };
};
