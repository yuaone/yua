// 📂 src/db/redis.ts
// 🔥 YUA-AI Redis Connector — STREAM PUB/SUB (2025.12 FINAL)

import Redis from "ioredis";
import dotenv from "dotenv";
import { log } from "../utils/logger";

dotenv.config();

const {
  REDIS_HOST = "127.0.0.1",
  REDIS_PORT = "6379",
  REDIS_PASSWORD,
} = process.env;

// --------------------------------------------------
// 1) Publisher
// --------------------------------------------------
export const redisPub = new Redis({
  host: REDIS_HOST,
  port: Number(REDIS_PORT),
  password: REDIS_PASSWORD || undefined,
  lazyConnect: true,
});

redisPub.on("connect", () => {
  log("🟢 [Redis] Publisher connected");
});

redisPub.on("error", (err: unknown) => {
  console.error("❌ [Redis][PUB] error", err);
});

// --------------------------------------------------
// 2) Subscriber
// --------------------------------------------------
export const redisSub = new Redis({
  host: REDIS_HOST,
  port: Number(REDIS_PORT),
  password: REDIS_PASSWORD || undefined,
  lazyConnect: true,
});

let subscriberConnected = false;

redisSub.on("connect", () => {
  subscriberConnected = true;
  log("🟢 [Redis] Subscriber connected");
});

redisSub.on("error", (err: unknown) => {
  console.error("❌ [Redis][SUB] error", err);
});

/**
 * 🔒 Subscriber 연결 보장
 * StreamEngine에서 subscribe 전에 호출해도 안전
 */
export async function ensureRedisSubscriber() {
  if (!subscriberConnected) {
    await redisSub.connect();
  }
}

// --------------------------------------------------
// 3) Helpers
// --------------------------------------------------

export function streamChannel(threadId: number): string {
  return `yua:stream:${threadId}`;
}
// --------------------------------------------------
// 4) Activity Title Worker (SSOT)
// --------------------------------------------------
export function titleJobStreamKey(): string {
  return `yua:activity_title:jobs`;
}

export function titlePatchChannel(threadId: number): string {
  return `yua:activity_title:patch:${threadId}`;
}
// 🔥 Thread Sidebar Title
export function threadTitleJobStreamKey(): string {
  return `yua:thread_title:jobs`;
}

export function threadTitlePatchChannel(threadId: number): string {
  return `yua:thread_title:patch:${threadId}`;
}

// 🔥 Dead Letter Stream
export function titleDeadLetterStreamKey(): string {
  return `yua:title:dead_letter`;
}

// --------------------------------------------------
// 5) Workspace Docs Realtime (Presence/Cursor)
// --------------------------------------------------
export function workspaceDocPresenceZKey(docId: string): string {
  return `yua:wsdocs:v1:presence:doc:${docId}:z`;
}

export function workspaceDocPresenceClientKey(docId: string, clientId: string): string {
  return `yua:wsdocs:v1:presence:doc:${docId}:client:${clientId}`;
}

export function workspaceDocCursorChannel(docId: string): string {
  return `yua:wsdocs:v1:cursor:doc:${docId}`;
}
