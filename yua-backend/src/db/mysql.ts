// 📂 src/db/mysql.ts
// 🔥 YUA-AI Enterprise MySQL Connector (2025.12 FINAL)

import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { log } from "../utils/logger";
import type { YuaStreamEvent } from "../types/stream";

dotenv.config();

const {
  MYSQL_HOST = "127.0.0.1",
  MYSQL_PORT = "3306",
  MYSQL_USER = "root",
  MYSQL_PASSWORD = "",
  MYSQL_DB = "yuaai",
} = process.env;

// --------------------------------------------------------------
// 1) Pool 설정
// --------------------------------------------------------------
export const mysqlPool = mysql.createPool({
  host: MYSQL_HOST,
  port: Number(MYSQL_PORT),
  user: MYSQL_USER,
  password: MYSQL_PASSWORD,
  database: MYSQL_DB,

  waitForConnections: true,
  connectionLimit: 20,
  queueLimit: 0,

  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

// --------------------------------------------------------------
// 2) Alias — 기존 코드 유지
// --------------------------------------------------------------
export const my = mysqlPool;
export const pool = mysqlPool;
export const db = mysqlPool;

// --------------------------------------------------------------
// 3) 연결 테스트
// --------------------------------------------------------------
export async function testMySQLConnection() {
  try {
    const [rows]: any = await mysqlPool.query("SELECT NOW() AS now");
    return { ok: true, now: rows?.[0]?.now };
  } catch (err: any) {
    return { ok: false, error: err.message || String(err) };
  }
}

// --------------------------------------------------------------
// 4) Initialize
// --------------------------------------------------------------
export async function initializeMySQL(): Promise<void> {
  log("🚀 [MySQL] Connecting...");

  const r = await testMySQLConnection();
  if (r.ok) {
    log(`🟢 [MySQL] Connected (Time: ${r.now})`);
  } else {
    log(`❌ [MySQL] Connection failed: ${r.error}`);
  }
}

// =============================================================
// 🔥 STEP 1 — Stream Event Helpers (SSOT)
// =============================================================

export async function insertStreamEvent(
  threadId: number,
  event: YuaStreamEvent
) {
  try {
    await mysqlPool.query(
      `
      INSERT INTO chat_stream_events
        (thread_id, trace_id, stage, token, done)
      VALUES (?, ?, ?, ?, ?)
      `,
      [
        threadId,
        event.traceId,
        event.stage ?? null,
        event.token ?? null,
        event.done === true,
      ]
    );
  } catch (err) {
    console.error("[STREAM][DB] insertStreamEvent failed", err);
  }
}

export async function loadStreamEvents(threadId: number) {
  try {
    const [rows]: any = await mysqlPool.query(
      `
      SELECT
        id,
        trace_id AS traceId,
        stage,
        token,
        done
      FROM chat_stream_events
      WHERE thread_id = ?
      ORDER BY id ASC
      `,
      [threadId]
    );
    return rows ?? [];
  } catch (err) {
    console.error("[STREAM][DB] loadStreamEvents failed", err);
    return [];
  }
}
