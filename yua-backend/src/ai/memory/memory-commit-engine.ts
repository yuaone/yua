// YUA Memory Commit Engine — USER DECLARED MEMORY (SSOT)

import { pgPool } from "../../db/postgres";
import type { MemoryScope } from "yua-shared/memory/types";

export const MemoryCommitEngine = {
  async commitDeclaredMemory(params: {
    workspaceId: string;
    userId: number;
    content: string;
    scope?: MemoryScope;
    instanceId?: string;
    threadId?: number;
    traceId?: string;
  }) {
    const {
      workspaceId,
      userId,
      content,
      scope = "general_knowledge",
      instanceId,
      threadId,
      traceId,
    } = params;

    if (!workspaceId || !userId) return;
    if (!content || content.trim().length < 3) return;

    await pgPool.query(
      `
      INSERT INTO memory_records
        (workspace_id, user_id, scope, content, confidence, source, locked, updated_by_instance, thread_id, trace_id)
      VALUES
        ($1, $2, $3, $4, $5, 'user_declared', TRUE, $6, $7, $8)
      `,
      [
        workspaceId,
        userId,
        scope,
        content.trim(),
        0.75,
        instanceId ?? null,
        threadId ?? null,
        traceId ?? null,
      ]
    );
  },
};
