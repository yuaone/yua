// 📂 src/ai/memory/runtime/memory-rule-context.ts
// 🧠 YUA Memory Rule Context — PHASE 12 SSOT
// - workspace scoped
// - async safe
// - in-memory cache
// - restart / manual reset only

import type { MemoryRuleSnapshot } from "./memory-rule.types";
import { loadMemoryRuleSnapshot } from "./memory-rule-loader";

const ruleCache = new Map<string, MemoryRuleSnapshot>();

/**
 * 🔒 Workspace 기준 Memory Rule 로드
 */
export async function getMemoryRules(
  workspaceId: string
): Promise<MemoryRuleSnapshot> {
  if (!workspaceId) {
    throw new Error("missing_workspace_id");
  }

  if (ruleCache.has(workspaceId)) {
    return ruleCache.get(workspaceId)!;
  }

  const snapshot = await loadMemoryRuleSnapshot(workspaceId);
  ruleCache.set(workspaceId, snapshot);
  return snapshot;
}

/**
 * 🔁 명시적 캐시 리셋 (Admin / 테스트 전용)
 */
export function resetMemoryRules(workspaceId?: string) {
  if (workspaceId) ruleCache.delete(workspaceId);
  else ruleCache.clear();
}
