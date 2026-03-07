// 🔥 AutoAgentEngine — INSTANCE AWARE SSOT FINAL (2025.12)

import { runProviderAuto } from "../../service/provider-engine";
import { CodeEngine } from "../code/code-engine";
import { ResearchEngine } from "../research/research-engine";
import { DocEngine } from "../doc/doc-engine";
import { AuditEngine } from "../audit/audit-engine";
import { toStringSafe } from "../universal/utils-safe";

import { enginePrisma } from "../../db/engine-prisma";
import { PolicyGuard } from "../guardrails/policy.guard";
import { LoggingEngine } from "../engines/logging-engine";

/* --------------------------------------------------
   Types
-------------------------------------------------- */

export interface AgentInput {
  instanceId: string; // 🔑 workspaceId 역할
  message: string;
  userId?: number;
  context?: any;
}

export interface AgentTask {
  intent: string;
  target?: string;
  code?: string;
  format?: string;
}

/* --------------------------------------------------
   Engine
-------------------------------------------------- */

export const AutoAgentEngine = {
  async detectTask(message: string): Promise<AgentTask> {
    const raw = await runProviderAuto(`
Intent만 JSON으로 추출하라.
${message}
`);
    try {
      return JSON.parse(toStringSafe(raw));
    } catch {
      return { intent: "unknown" };
    }
  },

  async executeTask(
    task: AgentTask,
    workspaceId: string
  ): Promise<string> {
    switch (task.intent) {
      case "code_analyze":
      case "code_fix":
      case "code_refactor":
        return CodeEngine.run({ code: task.code ?? "" });

      case "research_summary":
        return ResearchEngine.analyze({
          workspaceId,
          documents: [task.target ?? ""],
          goal: "summary",
        });

      case "research_compare":
        return ResearchEngine.analyze({
          workspaceId,
          documents: [task.target ?? ""],
          goal: "compare",
          compare: true,
        });

      case "doc_generate":
        return DocEngine.generate({
          type: "tech",
          title: "문서 생성",
          content: task.target ?? "",
        });

      default:
        return "요청 의도를 이해하지 못했습니다.";
    }
  },

  async run(input: AgentInput): Promise<string> {
    const { instanceId, message, userId = 0, context } = input;

    const instance = await enginePrisma.instance.findUnique({
      where: { id: instanceId },
    });
    if (!instance || instance.status !== "RUNNING") {
      throw new Error("Instance not running");
    }

    const task = await this.detectTask(message);

    await AuditEngine.record({
      route: "/agent/run",
      method: "POST",
      userId,
      requestData: { instanceId, task, context },
    });

    const result = await this.executeTask(task, instanceId);

    await LoggingEngine.record({
      route: "agent",
      instanceId,
      request: { message, task },
      response: result,
      userType: "agent",
    });

    return result;
  },
};
