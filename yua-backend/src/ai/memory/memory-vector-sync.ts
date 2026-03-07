// 📂 src/ai/memory/memory-vector-sync.ts
// 🔥 YUA-AI — Memory ⇄ Vector Sync Engine (2025.11 FIXED FINAL)
// ----------------------------------------------------------
// ✔ AdvisorEngine 자동 연동
// ✔ VectorEngine(search only) 구조 100% 호환
// ✔ 벡터 삽입 대신 MySQL + LocalCache 기반 동기화
// ✔ strict-ts 완전 대응
// ----------------------------------------------------------

import { pool } from "../../db/mysql";
import { log } from "../../utils/logger";

export const MemoryVectorSync = {
  // -------------------------------------------------------
  // 1) 메시지 + 답변 → MySQL 기반 벡터 동기화 (검색용 캐싱)
  // -------------------------------------------------------
  async sync(userMessage: string, assistantMessage: string): Promise<void> {
    try {
      if (!userMessage || !assistantMessage) return;

      const cleanUser = userMessage.trim();
      const cleanAssist = assistantMessage.trim();

      if (cleanUser.length < 3 || cleanAssist.length < 3) return;

      // 🔥 MySQL 기반 vector cache insert
      await pool.query(
        `
        INSERT INTO vector_cache (text, meta, created_at)
        VALUES (?, ?, NOW()), (?, ?, NOW())
      `,
        [
          cleanUser,
          "user_message",
          cleanAssist,
          "assistant_message",
        ]
      );

      log("🔵 [MemoryVectorSync] VectorCache 저장 완료");
    } catch (err: any) {
      log("❌ [MemoryVectorSync] ERROR: " + err.message);
    }
  },

  // -------------------------------------------------------
  // 2) Long Memory 벡터 동기화
  // -------------------------------------------------------
  async syncLongMemory(key: string, value: string): Promise<void> {
    try {
      if (!key || !value) return;

      await pool.query(
        `
        INSERT INTO vector_cache (text, meta, created_at)
        VALUES (?, ?, NOW())
        `,
        [`${key}: ${value}`, "long_memory"]
      );

      log(`🔵 [MemoryVectorSync] LongMemory '${key}' 저장 완료`);
    } catch (err: any) {
      log("❌ [MemoryVectorSync] syncLongMemory ERROR: " + err.message);
    }
  },

  // -------------------------------------------------------
  // 3) Project Memory 벡터 동기화
  // -------------------------------------------------------
  async syncProjectMemory(
    projectId: string,
    key: string,
    value: string
  ): Promise<void> {
    try {
      if (!projectId || !key || !value) return;

      await pool.query(
        `
        INSERT INTO vector_cache (text, meta, created_at)
        VALUES (?, ?, NOW())
        `,
        [`${projectId}:${key}:${value}`, "project_memory"]
      );

      log(`🔵 [MemoryVectorSync] ProjectMemory '${projectId}/${key}' 저장 완료`);
    } catch (err: any) {
      log("❌ [MemoryVectorSync] syncProjectMemory ERROR: " + err.message);
    }
  },
};
