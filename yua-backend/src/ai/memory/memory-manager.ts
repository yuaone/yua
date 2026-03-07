// 📂 src/ai/memory/memory-manager.ts
// 🔥 YUA MemoryManager — PHASE 12 → 15 (ADJUSTMENT AWARE)
// --------------------------------------------------
// ✔ EXECUTION ONLY
// ✔ 판단 ❌ / 학습 ❌ / Rule 변경 ❌
// ✔ PostgreSQL SSOT
// ✔ Workspace boundary strict
// ✔ Memory Freeze WRITE 차단
// ✔ PHASE 14 Adjustment READ & APPLY ONLY
// --------------------------------------------------

import { pgPool } from "../../db/postgres";
import type { MemoryScope } from "./memory-scope-router";

/* ===================================================
   Types
================================================== */

export interface MemoryRecordRow {
  id: number;
  content: string;
  confidence: number;
  scope: MemoryScope;
  created_at: Date;
  sensitivity?: "normal" | "restricted";
}

type AppliedAdjustment = {
  id: number;
  adjustment_type: string;
  scope: string;
  payload: Record<string, any>;
};

/* ===================================================
   Internal Helpers
================================================== */

async function assertWorkspaceWritable(workspaceId: string) {
  const { rows } = await pgPool.query<{ is_frozen: boolean }>(
    `
    SELECT is_frozen
    FROM workspace_memory_state
    WHERE workspace_id = $1
    `,
    [workspaceId]
  );

  if (rows[0]?.is_frozen === true) {
    return false;
  }
  return true;
}

/**
 * 🔒 PHASE 14
 * Workspace 기준 적용 완료된 Adjustment 로드
 */
async function loadAppliedAdjustments(
  workspaceId: string
): Promise<AppliedAdjustment[]> {
  const { rows } = await pgPool.query<AppliedAdjustment>(
    `
    SELECT
      id,
      adjustment_type,
      scope,
      payload
    FROM learning_adjustments
    WHERE workspace_id = $1
      AND status = 'APPLIED'
    ORDER BY applied_at DESC
    `,
    [workspaceId]
  );

  return rows;
}

/* ===================================================
   MemoryManager (SSOT)
================================================== */

export const MemoryManager = {
    /* --------------------------------------------------
     🧠 Retrieve Self Memory (READ ONLY, SSOT)
     - ACTIVE 1건만
     - Constitution / Identity 전용
  -------------------------------------------------- */
  async getSelfMemory(params: {
    workspaceId: string;
  }): Promise<
    | {
        constitutionKey: string;
        content: string;
        version: number;
        confidence: number;
      }
    | null
  > {
    const { workspaceId } = params;

    if (!workspaceId || workspaceId.trim().length < 10) {
      throw new Error("missing_workspace_id");
    }

    const { rows } = await pgPool.query<{
      constitution_key: string;
      content: string;
      version: number;
      confidence: number;
    }>(
      `
      SELECT
        constitution_key,
        content,
        version,
        confidence
      FROM self_memory
      WHERE workspace_id = $1
        AND status = 'ACTIVE'
      ORDER BY version DESC
      LIMIT 1
      `,
      [workspaceId]
    );

    if (!rows.length) return null;

    return {
      constitutionKey: rows[0].constitution_key,
      content: rows[0].content,
      version: rows[0].version,
      confidence: rows[0].confidence,
    };
  },
  /* --------------------------------------------------
     1️⃣ Commit Memory (EXPLICIT ONLY)
  -------------------------------------------------- */
  async commit(params: {
    workspaceId: string;
    createdByUserId: number;
    scope: MemoryScope;
    content: string;
    confidence: number;
    source: string;
    threadId?: number;
    traceId?: string;
    sensitivity?: "normal" | "restricted";
  }): Promise<void> {
    const {
      workspaceId,
      createdByUserId,
      scope,
      content,
      confidence,
      source,
      threadId,
      traceId,
      sensitivity = "normal",
    } = params;

    if (!workspaceId || workspaceId.trim().length < 10) {
      throw new Error("missing_workspace_id");
    }
    if (!Number.isFinite(createdByUserId) || createdByUserId <= 0) {
      throw new Error("invalid_createdByUserId");
    }
    if (!content || content.trim().length < 3) return;

    const writable = await assertWorkspaceWritable(workspaceId);
    if (!writable) return;

    // M-01 FIX: Transactional dedup guard — prevent race condition
    // Read existing + insert in same transaction with row-level lock
    const client = await pgPool.connect();
    try {
      await client.query("BEGIN");

      // Lock existing active records for this workspace+scope to prevent concurrent duplicates
      const existing = await client.query<{ content: string }>(
        `
        SELECT content
        FROM memory_records
        WHERE workspace_id = $1
          AND scope = $2
          AND is_active = true
        ORDER BY confidence DESC
        LIMIT 50
        FOR UPDATE
        `,
        [workspaceId, scope]
      );

      // Quick exact-match dedup (semantic dedup is done earlier in chat-engine)
      const trimmedContent = content.trim();
      const isDuplicate = existing.rows.some(
        (r) => r.content.trim() === trimmedContent
      );

      if (isDuplicate) {
        await client.query("ROLLBACK");
        return;
      }

      await client.query(
        `
        INSERT INTO memory_records (
          workspace_id,
          scope,
          content,
          confidence,
          source,
          thread_id,
          trace_id,
          sensitivity,
          created_by_user_id
        )
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        `,
        [
          workspaceId,
          scope,
          trimmedContent,
          Math.max(0, Math.min(1, confidence)),
          source,
          threadId ?? null,
          traceId ?? null,
          sensitivity,
          createdByUserId,
        ]
      );

      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  },

  /* --------------------------------------------------
     2️⃣ Retrieve Context Memory (READ ONLY)
     + PHASE 14 Adjustment-aware filtering
  -------------------------------------------------- */
  async retrieveContext(params: {
    workspaceId: string;
    scope?: MemoryScope;
    limit?: number;
    minConfidence?: number;
  }): Promise<
    {
      content: string;
      scope: MemoryScope;
      sensitivity?: "normal" | "restricted";
    }[]
  > {
    const { workspaceId, scope, limit = 12, minConfidence = 0.35 } = params;

    if (!workspaceId || workspaceId.trim().length < 10) {
      throw new Error("missing_workspace_id");
    }

    // 🔹 Load applied adjustments (PHASE 14)
    const adjustments = await loadAppliedAdjustments(workspaceId);

    // 🔹 Optional confidence floor adjustment (check all scopes)
    const confidenceFloorAdjustment =
      adjustments.find(
        (a) =>
          a.adjustment_type === "confidence_floor" &&
          (!scope || a.scope === scope)
      )?.payload?.minConfidence;

    const effectiveMinConfidence =
      typeof confidenceFloorAdjustment === "number"
        ? Math.max(minConfidence, confidenceFloorAdjustment)
        : minConfidence;

    // If scope is specified, filter by it; otherwise return all active memories
    const result = scope
      ? await pgPool.query<MemoryRecordRow>(
          `
          SELECT content, confidence, scope, sensitivity, created_at
          FROM memory_records
          WHERE workspace_id = $1
            AND scope = $2
            AND is_active = true
            AND confidence >= $3
          ORDER BY confidence DESC, created_at DESC
          LIMIT $4
          `,
          [workspaceId, scope, effectiveMinConfidence, limit]
        )
      : await pgPool.query<MemoryRecordRow>(
          `
          SELECT content, confidence, scope, sensitivity, created_at
          FROM memory_records
          WHERE workspace_id = $1
            AND is_active = true
            AND confidence >= $2
          ORDER BY confidence DESC, created_at DESC
          LIMIT $3
          `,
          [workspaceId, effectiveMinConfidence, limit]
        );

    return result.rows.map((r) => ({
      content: r.content,
      scope: r.scope,
      sensitivity: r.sensitivity ?? "normal",
    }));
  },

  /* --------------------------------------------------
     3️⃣ Retrieve Memory by Scope (PROJECT / DECISION)
     ✔ Context Runtime 전용
     ✔ 판단 / 병합 ❌
  -------------------------------------------------- */
  async retrieveByScope(params: {
    workspaceId: string;
    scope: MemoryScope;
    limit?: number;
    minConfidence?: number;
  }): Promise<
    {
      content: string;
      scope: MemoryScope;
      sensitivity?: "normal" | "restricted";
    }[]
  > {
    const {
      workspaceId,
      scope,
      limit = 8,
      minConfidence = 0.4,
    } = params;

    if (!workspaceId || workspaceId.trim().length < 10) {
      throw new Error("missing_workspace_id");
    }

    const result = await pgPool.query<MemoryRecordRow>(
      `
      SELECT
        content,
        confidence,
        scope,
        sensitivity,
        created_at
      FROM memory_records
      WHERE workspace_id = $1
        AND scope = $2
        AND is_active = true
        AND confidence >= $3
      ORDER BY confidence DESC, created_at DESC
      LIMIT $4
      `,
      [workspaceId, scope, minConfidence, limit]
    );

    return result.rows.map((r) => ({
      content: r.content,
      scope: r.scope,
      sensitivity: r.sensitivity ?? "normal",
    }));
  },
};
