// 📂 src/ai/memory/runtime/memory-rule-loader.ts
// 🔥 YUA Memory Rule Loader — PHASE 12-6 / 12-9-3

import type { MemoryRuleSnapshot } from "./memory-rule.types";
import { MemoryRuleSnapshotRepo } from "../repo/memory-rule-snapshot.repo";

const cache = new Map<string, MemoryRuleSnapshot>();

export async function loadMemoryRuleSnapshot(
  workspaceId: string
): Promise<MemoryRuleSnapshot> {
  if (cache.has(workspaceId)) {
    return cache.get(workspaceId)!;
  }

  const snapshot =
    await MemoryRuleSnapshotRepo.getLatestApproved(workspaceId);

  if (!snapshot) {
    throw new Error(
      `[MemoryRule] no approved snapshot for workspace ${workspaceId}`
    );
  }

  cache.set(workspaceId, snapshot.rules);
  return snapshot.rules;
}

/**
 * 🔥 PHASE 12-9-3
 * Rule Apply / Rollback 후 반드시 호출
 */
export function invalidateMemoryRuleCache(
  workspaceId: string
): void {
  cache.delete(workspaceId);
}
