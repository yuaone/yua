// 🔥 Thread Semantic State Repository (SSOT GRAPH CORE)

import { pgPool } from "../../db/postgres";

export type ThreadSemanticState = {
  threadId: number;
  activeTopic?: string | null;
  activeIntent?: string | null;
  entityStack?: string[];
  lastUserMessage?: string | null;
};

export const ThreadSemanticStateRepository = {
  async get(threadId: number): Promise<ThreadSemanticState | null> {
    const { rows } = await pgPool.query(
      `
      SELECT thread_id,
             active_topic,
             active_intent,
             entity_stack,
             last_user_message
      FROM thread_semantic_state
      WHERE thread_id = $1
      `,
      [threadId]
    );

    if (!rows[0]) return null;

    return {
      threadId: rows[0].thread_id,
      activeTopic: rows[0].active_topic,
      activeIntent: rows[0].active_intent,
      entityStack: rows[0].entity_stack ?? [],
      lastUserMessage: rows[0].last_user_message,
    };
  },

  async upsert(state: ThreadSemanticState) {
    await pgPool.query(
      `
      INSERT INTO thread_semantic_state (
        thread_id,
        active_topic,
        active_intent,
        entity_stack,
        last_user_message,
        updated_at
      )
      VALUES ($1,$2,$3,$4::jsonb,$5,now())
      ON CONFLICT (thread_id)
      DO UPDATE SET
        active_topic = EXCLUDED.active_topic,
        active_intent = EXCLUDED.active_intent,
        entity_stack = EXCLUDED.entity_stack,
        last_user_message = EXCLUDED.last_user_message,
        updated_at = now()
      `,
      [
        state.threadId,
        state.activeTopic ?? null,
        state.activeIntent ?? null,
        JSON.stringify(state.entityStack ?? []),
        state.lastUserMessage ?? null,
      ]
    );
  },
};