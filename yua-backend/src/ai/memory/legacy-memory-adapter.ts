// 📂 src/ai/memory/legacy-memory-adapter.ts
// 🔥 Legacy Memory Adapter — Engine Compatibility Layer
// ❌ NO SSOT VIOLATION
// ❌ NO MemoryManager MODIFICATION

import { MemoryManager as Core } from "./memory-manager";
import type { MemoryScope } from "./memory-scope-router";

/* --------------------------------------------------
   Legacy Types (Engine Expectation)
-------------------------------------------------- */

export interface LegacyMemoryItem {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface LegacyAssembledMemory {
  short: LegacyMemoryItem[];
  long: Record<string, string>;
}

/* --------------------------------------------------
   Adapter
-------------------------------------------------- */

export const MemoryManager = {
  /* ---------- Legacy: assembleMemory ---------- */
  async assembleMemory(params: {
    userMessage: string;
    projectId?: string;
  }): Promise<LegacyAssembledMemory> {
    // ⚠️ workspaceId는 엔진 레벨에서 반드시 주입되었어야 함
    // 임시 규칙: projectId → workspaceId, 없으면 throw
    const workspaceId = params.projectId;
    if (!workspaceId) {
      throw new Error("assembleMemory requires workspaceId/projectId");
    }

    const context = await Core.retrieveContext({
      workspaceId,
      limit: 12,
    });

    return {
      short: context.map((c) => ({
        role: "system",
        content: c.content,
      })),
      long: {}, // legacy 엔진들이 object 형태를 기대
    };
  },

  /* ---------- Legacy: updateShortMemory ---------- */
  async updateShortMemory(
    userId: number,
    userMessage: string,
    assistantMessage: string
  ): Promise<void> {
    if (!assistantMessage?.trim()) return;

    await Core.commit({
      workspaceId: String(userId), // ⚠️ legacy fallback
      createdByUserId: userId,
      scope: "general_knowledge",
      content: assistantMessage,
      confidence: 0.6,
      source: "legacy-short",
    });
  },

  /* ---------- Legacy: updateProjectMemory ---------- */
  async updateProjectMemory(
    projectId: string,
    key: string,
    content: string
  ): Promise<void> {
    if (!content?.trim()) return;

    await Core.commit({
      workspaceId: projectId,
      createdByUserId: 0,
      scope: "project_architecture",
      content: `[${key}] ${content}`,
      confidence: 0.7,
      source: "legacy-project",
    });
  },

  /* ---------- Legacy: getRecentHPEMemory ---------- */
  async getRecentHPEMemory(limit: number = 5): Promise<string[]> {
    // HPE는 context memory로 흡수됨 (Phase 12+)
    return [];
  },
};
