// src/ai/memory/run-memory-merge.ts
// Batch runner for Two-Tier memory merge.
// Iterates all active workspaces × scopes, runs MemoryMergeEngine.mergeNearDuplicates.

import { pgPool } from "../../db/postgres.js";
import { MemoryMergeEngine } from "./memory-merge.engine.js";

const SCOPES = [
  "user_profile",
  "user_preference",
  "project_architecture",
  "project_decision",
  "user_research",
  "general_knowledge",
] as const;

(async () => {
  try {
    console.log("[MEMORY_MERGE] Starting batch merge...");

    // Fetch all active workspaces
    const { rows: workspaces } = await pgPool.query<{ id: string }>(
      `SELECT id FROM workspaces WHERE is_active = true ORDER BY id`
    );

    console.log(`[MEMORY_MERGE] Found ${workspaces.length} active workspaces`);

    let totalDedup = 0;
    let totalMerge = 0;
    let totalErrors = 0;

    for (const ws of workspaces) {
      for (const scope of SCOPES) {
        try {
          const results = await MemoryMergeEngine.mergeNearDuplicates({
            workspaceId: ws.id,
            scope,
          });

          for (const r of results) {
            if (r.mergeType === "DEDUP") {
              totalDedup += r.mergedIds.length;
            } else {
              totalMerge += r.mergedIds.length;
            }
            console.log(
              `[MEMORY_MERGE] workspace=${ws.id} scope=${scope} type=${r.mergeType} base=${r.baseId} merged=${r.mergedIds.length} sim=${r.similarity.toFixed(3)}`
            );
          }
        } catch (err) {
          totalErrors++;
          console.error(
            `[MEMORY_MERGE] Error workspace=${ws.id} scope=${scope}`,
            err
          );
        }
      }
    }

    console.log(
      `[MEMORY_MERGE] Done — dedup=${totalDedup} merge=${totalMerge} errors=${totalErrors}`
    );
    process.exit(0);
  } catch (err) {
    console.error("[MEMORY_MERGE] Fatal error", err);
    process.exit(1);
  }
})();
