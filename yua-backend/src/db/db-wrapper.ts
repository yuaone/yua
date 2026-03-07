// 📂 src/db/db-wrapper.ts
// 🔥 Unified DB Wrapper — Final TS-Safe Version (2025.12)

import { mysqlPool } from "./mysql";

/**
 * ⚡ Query Wrapper (MySQL 전용)
 * - mysql2/promise 의 query()는 [rows, fields] 형태
 * - rows: RowDataPacket[] | OkPacket | OkPacket[]
 * - 배열인지 먼저 확인 → TS 오류 0
 */
export async function query(sql: string, params: any[] = []) {
  const [rows] = await mysqlPool.query(sql, params);

  // ⭐ Type Guard: 배열이 아니면 빈 배열 처리
  if (!Array.isArray(rows)) {
    return [];
  }

  return rows; // RowDataPacket[]
}

/**
 * ⚡ Transaction Wrapper
 */
export async function transaction(callback: any) {
  const conn = await mysqlPool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await callback(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
