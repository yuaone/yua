import { YuaExecutionTask, YuaToolResult } from "yua-shared";

export type YuaToolRunStatus =
  | "planned"
  | "running"
  | "finished"
  | "error"
  | "cached";

export type YuaToolRunRecord = {
  id: string;

  traceId: string;
  threadId?: number;
  workspaceId: string;

  task: YuaExecutionTask;
  status: YuaToolRunStatus;

  inputsHash: string;
  toolVersion: string;

  result?: YuaToolResult<any>;

  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
};
