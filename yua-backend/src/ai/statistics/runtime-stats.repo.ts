// 🔒 PHASE 7.5 Runtime Statistics Repository (SSOT)

import { pgPool } from "../../db/postgres";
import type { RuntimeStatRecord } from "./runtime-stats.types";

/**
 * 🔒 Runtime Statistics Repository
 * - Write-only
 * - Runtime-safe
 * - pgPool SSOT 사용
 */
export class RuntimeStatsRepo {
  static async insert(stat: RuntimeStatRecord): Promise<void> {
    const q = `
      INSERT INTO runtime_statistics (
        thread_id,
        trace_id,
        path,
        engine,
        tool_level,
        confidence,
        risk,
        tool_score,
        verifier_budget,
        verifier_used,
        verifier_failed,
        verdict,
        path_changed
      ) VALUES (
        $1,$2,$3,$4,$5,
        $6,$7,$8,
        $9,$10,$11,
        $12,$13
      )
    `;

    const values = [
      stat.threadId ?? null,
      stat.traceId ?? null,
      stat.path,
      stat.engine,
      stat.toolLevel,
      stat.confidence,
      stat.risk,
      stat.toolScore,
      stat.verifierBudget,
      stat.verifierUsed,
      stat.verifierFailed,
      stat.verdict,
      stat.pathChanged,
    ];

    await pgPool.query(q, values);
  }
}
