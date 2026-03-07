// 📂 src/ai/memory/unified-memory-gate.ts
// 🔒 Unified Memory Gate — Cross-Thread Memory Integration (CR-3)
// --------------------------------------------------
// ✔ Single entry point for all memory layers
// ✔ User profile/preference always loaded (lightweight)
// ✔ Project memory loaded when allowed
// ✔ Cross-thread memory (relaxed gates)
// ✔ Token-budgeted combined context
// --------------------------------------------------

import { MemoryManager } from "./memory-manager";
import { CrossMemoryRepo } from "./cross/cross-memory.repo";
import type { CrossMemoryRow } from "./cross/cross-memory.repo";
import type { MemoryScope } from "./memory-scope-router";

/* ===================================================
   Types
=================================================== */

export interface UnifiedMemoryParams {
  workspaceId: string;
  userId: number;
  threadId?: number;
  projectId?: string;
  mode?: "FAST" | "NORMAL" | "SEARCH" | "DEEP" | "RESEARCH";
  allowHeavyMemory?: boolean;
}

export interface UnifiedMemoryResult {
  /** user_profile + user_preference (always loaded) */
  userContext: string | undefined;
  /** project_architecture + project_decision */
  projectContext: string | undefined;
  /** USER_LONGTERM + DECISION + PINNED */
  crossThreadContext: string | undefined;
  /** all merged, token-budgeted */
  combinedContext: string;
}

/* ===================================================
   Main
=================================================== */

export async function loadUnifiedMemory(
  params: UnifiedMemoryParams,
): Promise<UnifiedMemoryResult> {
  const { workspaceId, userId, mode, allowHeavyMemory } = params;

  // 1. ALWAYS load user profile (lightweight, max 3 records)
  const userProfile = await MemoryManager.retrieveByScope({
    workspaceId,
    scope: "user_profile",
    limit: 3,
  });
  const userPreference = await MemoryManager.retrieveByScope({
    workspaceId,
    scope: "user_preference",
    limit: 3,
  });

  // 2. Load project memory if allowed
  let projectMemory: { content: string; scope: MemoryScope }[] = [];
  if (allowHeavyMemory !== false) {
    const arch = await MemoryManager.retrieveByScope({
      workspaceId,
      scope: "project_architecture",
      limit: mode === "FAST" ? 2 : 5,
    });
    const decisions = await MemoryManager.retrieveByScope({
      workspaceId,
      scope: "project_decision",
      limit: mode === "FAST" ? 2 : 5,
    });
    projectMemory = [...arch, ...decisions];
  }

  // 3. Load cross-thread memory (relaxed gates — no anchorConfidence requirement)
  let crossMemory: CrossMemoryRow[] = [];
  try {
    const crossRows = await CrossMemoryRepo.list({
      workspaceId,
      userId,
      types: ["USER_LONGTERM", "USER_PROFILE", "DECISION", "PINNED"],
      limit: 6,
    });
    crossMemory = crossRows;
  } catch {
    /* silent */
  }

  // 4. Format contexts
  const userContext = formatUserContext(userProfile, userPreference);
  const projectContext = formatProjectContext(projectMemory);
  const crossThreadContext = formatCrossThreadContext(crossMemory);

  // 5. Combine with token budget
  const parts = [userContext, crossThreadContext, projectContext].filter(
    Boolean,
  );
  const combinedContext = parts.join("\n\n");

  return { userContext, projectContext, crossThreadContext, combinedContext };
}

/* ===================================================
   Helpers
=================================================== */

function formatUserContext(
  profile: { content: string }[],
  preferences: { content: string }[],
): string | undefined {
  const items = [
    ...profile.map((p) => `[User] ${p.content}`),
    ...preferences.map((p) => `[Preference] ${p.content}`),
  ];
  return items.length > 0 ? items.join("\n") : undefined;
}

function formatProjectContext(
  memories: { content: string; scope: MemoryScope }[],
): string | undefined {
  if (!memories.length) return undefined;
  return memories
    .map(
      (m) =>
        `[${m.scope === "project_architecture" ? "Architecture" : "Decision"}] ${m.content}`,
    )
    .join("\n");
}

function formatCrossThreadContext(
  rows: CrossMemoryRow[],
): string | undefined {
  if (!rows.length) return undefined;
  return rows.map((r) => `[${r.type}] ${r.summary}`).join("\n");
}
