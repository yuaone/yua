// 📂 src/db/postgres.ts
// 🔥 YUA-AI Enterprise PostgreSQL Connector — FINAL (2025.12)
import "dotenv/config";
import { Pool, PoolConfig } from "pg";
import { log } from "../utils/logger";

function safeEnv(v?: string): string {
  return (v ?? "").trim();
}

const config: PoolConfig = {
  host: safeEnv(process.env.POSTGRES_HOST) || "127.0.0.1",
  port: Number(safeEnv(process.env.POSTGRES_PORT) || "5432"),
  user: safeEnv(process.env.POSTGRES_USER) || "postgres",
  password: safeEnv(process.env.POSTGRES_PASSWORD),
  database: safeEnv(process.env.POSTGRES_DB) || "postgres",

  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,

  ssl:
    safeEnv(process.env.POSTGRES_SSL) === "true"
      ? { rejectUnauthorized: false }
      : false,
};

export const pgPool = new Pool(config);

export async function ensurePgVector() {
  try {
    await pgPool.query(`CREATE EXTENSION IF NOT EXISTS vector;`);
    log("🧬 [PostgreSQL] pgvector extension ready.");
  } catch (e: any) {
    log("❌ pgvector load error: " + e.message);
  }
}

export async function testPostgresConnection() {
  try {
    const r = await pgPool.query<{ now: string }>("SELECT NOW() AS now");
    return { ok: true, now: r.rows[0]?.now };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

export async function initializePostgres() {
  log("🚀 [PostgreSQL] Connecting...");

  const r = await testPostgresConnection();
  if (!r.ok) log(`❌ Connection failed: ${r.error}`);
  else log(`🟢 Connected (Time: ${r.now})`);

  await ensurePgVector();
}
