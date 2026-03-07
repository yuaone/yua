import { redisPub } from "../../db/redis";
import {
  workspaceDocCursorChannel,
  workspaceDocPresenceClientKey,
  workspaceDocPresenceZKey,
} from "../../db/redis";

export const DOC_PRESENCE_TTL_SEC = 45;
const DOC_PRESENCE_STALE_GRACE_MS = 2_000;

export type WorkspaceDocCursor = {
  anchor: number;
  head: number;
};

export type WorkspaceDocPresence = {
  docId: string;
  workspaceId: string;
  userId: number;
  clientId: string;
  displayName?: string | null;
  color?: string | null;
  cursor?: WorkspaceDocCursor | null;
  updatedAt: number;
};

type CursorBroadcastPayload = {
  type: "cursor";
  docId: string;
  workspaceId: string;
  userId: number;
  clientId: string;
  cursor: WorkspaceDocCursor | null;
  updatedAt: number;
  serverId?: string;
};

function nowMs(): number {
  return Date.now();
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function normalizeCursor(cursor: WorkspaceDocCursor | null | undefined): WorkspaceDocCursor | null {
  if (!cursor) return null;
  if (!isFiniteNumber(cursor.anchor) || !isFiniteNumber(cursor.head)) return null;
  return {
    anchor: Math.max(0, Math.floor(cursor.anchor)),
    head: Math.max(0, Math.floor(cursor.head)),
  };
}

function parsePresence(raw: string): WorkspaceDocPresence | null {
  try {
    const parsed = JSON.parse(raw) as Partial<WorkspaceDocPresence>;
    if (!parsed || typeof parsed !== "object") return null;
    if (typeof parsed.docId !== "string" || parsed.docId.length === 0) return null;
    if (typeof parsed.workspaceId !== "string" || parsed.workspaceId.length === 0) return null;
    if (!isFiniteNumber(parsed.userId)) return null;
    if (typeof parsed.clientId !== "string" || parsed.clientId.length === 0) return null;
    if (!isFiniteNumber(parsed.updatedAt)) return null;

    return {
      docId: parsed.docId,
      workspaceId: parsed.workspaceId,
      userId: Math.floor(parsed.userId),
      clientId: parsed.clientId,
      displayName: typeof parsed.displayName === "string" ? parsed.displayName : null,
      color: typeof parsed.color === "string" ? parsed.color : null,
      cursor: normalizeCursor(parsed.cursor ?? null),
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return null;
  }
}

async function ensureRedisPublisherReady(): Promise<void> {
  if (redisPub.status !== "ready") {
    await redisPub.connect();
  }
}

export class WorkspaceDocPresenceRedis {
  static async upsert(input: {
    docId: string;
    workspaceId: string;
    userId: number;
    clientId: string;
    displayName?: string | null;
    color?: string | null;
    cursor?: WorkspaceDocCursor | null;
    ttlSec?: number;
  }): Promise<WorkspaceDocPresence> {
    await ensureRedisPublisherReady();

    const ts = nowMs();
    const ttlSec = Math.max(10, Math.floor(input.ttlSec ?? DOC_PRESENCE_TTL_SEC));
    const presence: WorkspaceDocPresence = {
      docId: input.docId,
      workspaceId: input.workspaceId,
      userId: Math.floor(input.userId),
      clientId: input.clientId,
      displayName: input.displayName ?? null,
      color: input.color ?? null,
      cursor: normalizeCursor(input.cursor ?? null),
      updatedAt: ts,
    };

    const zKey = workspaceDocPresenceZKey(input.docId);
    const cKey = workspaceDocPresenceClientKey(input.docId, input.clientId);

    await redisPub
      .multi()
      .set(cKey, JSON.stringify(presence), "EX", ttlSec)
      .zadd(zKey, String(ts), input.clientId)
      .expire(zKey, ttlSec + 20)
      .exec();

    return presence;
  }

  static async heartbeat(input: {
    docId: string;
    clientId: string;
    ttlSec?: number;
  }): Promise<boolean> {
    await ensureRedisPublisherReady();

    const cKey = workspaceDocPresenceClientKey(input.docId, input.clientId);
    const raw = await redisPub.get(cKey);
    if (!raw) return false;

    const presence = parsePresence(raw);
    if (!presence) return false;

    const ttlSec = Math.max(10, Math.floor(input.ttlSec ?? DOC_PRESENCE_TTL_SEC));
    const ts = nowMs();
    presence.updatedAt = ts;

    const zKey = workspaceDocPresenceZKey(input.docId);
    await redisPub
      .multi()
      .set(cKey, JSON.stringify(presence), "EX", ttlSec)
      .zadd(zKey, String(ts), input.clientId)
      .expire(zKey, ttlSec + 20)
      .exec();

    return true;
  }

  static async remove(input: { docId: string; clientId: string }): Promise<void> {
    await ensureRedisPublisherReady();
    const zKey = workspaceDocPresenceZKey(input.docId);
    const cKey = workspaceDocPresenceClientKey(input.docId, input.clientId);
    await redisPub.multi().del(cKey).zrem(zKey, input.clientId).exec();
  }

  static async list(docId: string): Promise<WorkspaceDocPresence[]> {
    await ensureRedisPublisherReady();

    const zKey = workspaceDocPresenceZKey(docId);
    const minAliveTs = nowMs() - DOC_PRESENCE_TTL_SEC * 1000 - DOC_PRESENCE_STALE_GRACE_MS;

    await redisPub.zremrangebyscore(zKey, "-inf", String(minAliveTs));
    const clientIds = await redisPub.zrange(zKey, 0, -1);
    if (clientIds.length === 0) return [];

    const keys = clientIds.map((clientId) => workspaceDocPresenceClientKey(docId, clientId));
    const raw = await redisPub.mget(keys);

    const out: WorkspaceDocPresence[] = [];
    for (let i = 0; i < raw.length; i += 1) {
      const value = raw[i];
      const clientId = clientIds[i];
      if (!value || !clientId) continue;
      const parsed = parsePresence(value);
      if (!parsed) continue;
      if (parsed.clientId !== clientId) continue;
      out.push(parsed);
    }
    return out.sort((a, b) => a.updatedAt - b.updatedAt);
  }

  static async publishCursor(input: {
    docId: string;
    workspaceId: string;
    userId: number;
    clientId: string;
    cursor: WorkspaceDocCursor | null;
    serverId?: string;
  }): Promise<void> {
    await ensureRedisPublisherReady();
    const channel = workspaceDocCursorChannel(input.docId);
    const payload: CursorBroadcastPayload = {
      type: "cursor",
      docId: input.docId,
      workspaceId: input.workspaceId,
      userId: Math.floor(input.userId),
      clientId: input.clientId,
      cursor: normalizeCursor(input.cursor),
      updatedAt: nowMs(),
      serverId: input.serverId,
    };
    await redisPub.publish(channel, JSON.stringify(payload));
  }
}
