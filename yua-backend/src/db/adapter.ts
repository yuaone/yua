// 📂 src/db/adapter.ts
// -------------------------------------------------------------
// YUA-AI DB Adapter — PostgreSQL + pgvector (2026 FINAL)
// -------------------------------------------------------------
// ✔ save(table, data)        → JSON 자동 저장
// ✔ saveVector(table, vec,text) → pgvector + 내용 저장
// ✔ autoInit()               → 테이블 자동 생성 (누락시 생성)
// ✔ 타입자동평탄화           → Object는 JSON으로 변환
// ✔ 엔진 자동 기록 호환 — autoEngineDB 미들웨어 연동
// -------------------------------------------------------------

import { Pool } from "pg";
import { logger } from "../utils/logger";

// DB Connection ---------------------------------------------
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// 자동 테이블 생성 --------------------------------------------
async function ensureTable(table: string) {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS ${table} (
        id SERIAL PRIMARY KEY,
        data JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
  } catch (err: any) {
    logger.error(`[DB] ensureTable ${table} failed`, err?.message || err);
  } finally {
    client.release();
  }
}

// pgvector 테이블 생성 ----------------------------------------
async function ensureVectorTable(table: string) {
  const client = await pool.connect();
  try {
    // pgvector extension
    await client.query(`CREATE EXTENSION IF NOT EXISTS vector;`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ${table} (
        id SERIAL PRIMARY KEY,
        embedding VECTOR(1536),
        text TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
  } catch (err: any) {
    logger.error(`[DB] ensureVectorTable ${table} failed`, err?.message || err);
  } finally {
    client.release();
  }
}

// 자동 flatten ------------------------------------------------
function safeData(obj: any) {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch {
    return { value: String(obj) };
  }
}

// -------------------------------------------------------------
// ⭐ PUBLIC API
// -------------------------------------------------------------
export const DB = {
  /**
   * 데이터 저장 (table = 문자열, data = JS 객체)
   */
  async save(table: string, data: any) {
    try {
      await ensureTable(table);

      const client = await pool.connect();
      await client.query(
        `INSERT INTO ${table}(data) VALUES ($1)`,
        [safeData(data)]
      );
      client.release();
    } catch (err: any) {
      logger.error(`[DB] save ${table} failed`, err?.message || err);
    }
  },

  /**
   * pgvector 저장 (embedding + text)
   */
  async saveVector(table: string, embedding: number[], text: string) {
    try {
      await ensureVectorTable(table);

      const client = await pool.connect();
      await client.query(
        `INSERT INTO ${table}(embedding, text) VALUES ($1, $2)`,
        [embedding, text]
      );
      client.release();
    } catch (err: any) {
      logger.error(`[DB] saveVector ${table} failed`, err?.message || err);
    }
  },

  /**
   * Raw SQL
   */
  async query(sql: string, params?: any[]) {
    const client = await pool.connect();
    try {
      const result = await client.query(sql, params);
      return result.rows;
    } finally {
      client.release();
    }
  }
};
