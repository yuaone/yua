// 🔥 Task Runner — ENTERPRISE FINAL PATCH (2025.12)

import { ResearchEngine } from "../research/research-engine";
import { DocEngine } from "../doc/doc-engine";
import { AutoAgentEngine } from "../agent/auto-agent-engine";

export const TaskRunner = {
  async run(action: string, payload: any): Promise<string> {
    const workspaceId = payload?.workspaceId;

    switch (action) {
      /* ----------------------------------------------------
         1) Research Summary
      ---------------------------------------------------- */
      case "research_summary": {
        if (!workspaceId) {
          throw new Error("workspaceId is required for research_summary");
        }
        return await ResearchEngine.analyze({
          workspaceId,
          documents: [payload?.text ?? ""],
          goal: "summary",
        });
      }

      /* ----------------------------------------------------
         2) Research Compare
      ---------------------------------------------------- */
      case "research_compare": {
        if (!workspaceId) {
          throw new Error("workspaceId is required for research_compare");
        }
        return await ResearchEngine.analyze({
          workspaceId,
          documents: payload?.items ?? [],
          goal: "compare",
          compare: true,
        });
      }

      /* ----------------------------------------------------
         3) Doc Generate
      ---------------------------------------------------- */
      case "doc_generate":
        return await DocEngine.generate({
          type: payload?.type ?? "tech",
          title: payload?.title ?? "Generated Document",
          content: payload?.content ?? "",
          items: payload?.items ?? [],
        });

      /* ----------------------------------------------------
         4) AutoAgent (INSTANCE BASED)
      ---------------------------------------------------- */
      case "autoagent":
        return await AutoAgentEngine.run({
          instanceId: payload?.instanceId,
          message: payload?.message ?? "",
          userId: payload?.userId,
          context: payload?.context,
        });

      /* ----------------------------------------------------
         5) Unknown
      ---------------------------------------------------- */
      default:
        return `알 수 없는 작업: ${action}`;
    }
  },
};
