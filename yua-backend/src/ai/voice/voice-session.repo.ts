import { redisPub } from "../../db/redis";
import type { VoiceSessionRecord } from "./voice.types";

const KEY = (sessionId: string) => `yua:voice:v1:session:${sessionId}`;

export class VoiceSessionRepo {
  static async put(session: VoiceSessionRecord) {
    await redisPub.hset(KEY(session.sessionId), {
      sessionId: session.sessionId,
      traceId: session.traceId,
      threadId: String(session.threadId),
      workspaceId: session.workspaceId,
      userId: String(session.userId),
      createdAt: String(session.createdAt),
      status: session.status,
    });

    // 세션 TTL (예: 2시간) — 운영에서 조정
    await redisPub.expire(KEY(session.sessionId), 2 * 60 * 60);
  }

  static async get(sessionId: string): Promise<VoiceSessionRecord | null> {
    const m = await redisPub.hgetall(KEY(sessionId));
    if (!m || !m.sessionId) return null;
    return {
      sessionId: m.sessionId,
      traceId: m.traceId,
      threadId: Number(m.threadId),
      workspaceId: m.workspaceId,
      userId: Number(m.userId),
      createdAt: Number(m.createdAt),
      status: (m.status as any) ?? "ACTIVE",
    };
  }

  static async close(sessionId: string) {
    await redisPub.hset(KEY(sessionId), { status: "CLOSED" });
    await redisPub.expire(KEY(sessionId), 10 * 60); // 닫힌 건 빨리 정리
  }
}