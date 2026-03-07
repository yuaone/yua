import type { ResponseAffordanceVector } from "./response-affordance";
import { pgPool } from "../../db/postgres";
import type { DecisionContext } from "./decision-context.types";

type StoredAffordance = {
  value: ResponseAffordanceVector;
  toneBias?: DecisionContext["toneBias"];
  updatedAt: number;
};

async function loadFromDb(
  workspaceId: string,
  threadId: number
): Promise<StoredAffordance | undefined> {
  try {
    const r = await pgPool.query<{
      affordance: ResponseAffordanceVector;
      tone_bias: DecisionContext["toneBias"] | null;
      updated_at: Date;
    }>(
      `
      SELECT affordance, tone_bias, updated_at
      FROM thread_response_affordance
      WHERE workspace_id = $1
      AND thread_id = $2
      `,
      [workspaceId, threadId]
    );

    if (r.rowCount === 0) return undefined;

    return {
      value: r.rows[0].affordance,
      toneBias: r.rows[0].tone_bias ?? undefined,
      updatedAt: new Date(r.rows[0].updated_at).getTime(),
    };
  } catch (e) {
    console.warn("[AFFORDANCE_STORE][DB_LOAD_FAIL]", e);
    return undefined;
  }
}

class AffordanceThreadStoreImpl {
  private store = new Map<string, StoredAffordance>();

  // 🔥 1시간 소프트 TTL (캐시용)
  private readonly SOFT_TTL_MS = 60 * 60 * 1000;

  async get(
    workspaceId: string,
    threadId: number
  ): Promise<
    | {
        affordance: ResponseAffordanceVector;
        toneBias?: DecisionContext["toneBias"];
      }
    | undefined
  > {
    const now = Date.now();
    const cacheKey = `${workspaceId}:${threadId}`;
    const entry = this.store.get(cacheKey);

    // ✅ memory hit
    if (entry) {
      return {
        affordance: entry.value,
        toneBias: entry.toneBias,
      };
    }

    // 🔥 Always hydrate from DB (no hard expire)
    const dbValue = await loadFromDb(workspaceId, threadId);
    if (!dbValue) return undefined;

    // 🔒 Soft TTL은 캐시 신선도 로그만 남김
    if (now - dbValue.updatedAt > this.SOFT_TTL_MS) {
      console.log("[AFFORDANCE_STORE][SOFT_STALE]", {
        workspaceId,
        threadId,
      });
    }

    this.store.set(cacheKey, dbValue);

    return {
      affordance: dbValue.value,
      toneBias: dbValue.toneBias,
    };
  }

  async set(
    workspaceId: string,
    threadId: number,
    payload: {
      affordance: ResponseAffordanceVector;
      toneBias?: DecisionContext["toneBias"];
    }
  ): Promise<void> {
    const now = Date.now();
    const cacheKey = `${workspaceId}:${threadId}`;

    // 🔒 memory cache
    this.store.set(cacheKey, {
      value: payload.affordance,
      toneBias: payload.toneBias,
      updatedAt: now,
    });

    // 🔒 DB upsert (workspace-safe)
    await pgPool.query(
      `
      INSERT INTO thread_response_affordance
        (workspace_id, thread_id, affordance, tone_bias, updated_at)
      VALUES ($1, $2, $3, $4, NOW())
      ON CONFLICT (workspace_id, thread_id)
      DO UPDATE SET
        affordance = EXCLUDED.affordance,
        tone_bias = EXCLUDED.tone_bias,
        updated_at = NOW()
      `,
      [
        workspaceId,
        threadId,
        payload.affordance,
        payload.toneBias ?? null,
      ]
    );

    console.log("[AFFORDANCE_STORE][SET]", {
      workspaceId,
      threadId,
    });
  }

  async clear(
    workspaceId: string,
    threadId: number
  ): Promise<void> {
    const cacheKey = `${workspaceId}:${threadId}`;

    this.store.delete(cacheKey);

    await pgPool.query(
      `
      DELETE FROM thread_response_affordance
      WHERE workspace_id = $1
      AND thread_id = $2
      `,
      [workspaceId, threadId]
    );

    console.log("[AFFORDANCE_STORE][CLEARED]", {
      workspaceId,
      threadId,
    });
  }
}

export const AffordanceThreadStore =
  new AffordanceThreadStoreImpl();