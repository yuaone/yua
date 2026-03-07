import type http from "http";
import { randomUUID } from "crypto";
import WebSocket, { WebSocketServer } from "ws";
import { getUserFromRequest } from "../auth/auth.server";
import { WorkspaceAccess } from "../ai/workspace/workspace-access";
import { pgPool } from "../db/postgres";
import { ensureRedisSubscriber, redisSub, workspaceDocCursorChannel } from "../db/redis";
import {
  DOC_PRESENCE_TTL_SEC,
  WorkspaceDocPresenceRedis,
  type WorkspaceDocCursor,
} from "../ai/workspace/workspace-doc-presence.redis";
import { isUuid } from "../utils/is-uuid";
import { log } from "../utils/logger";
import { WorkspaceDocCollabRepo } from "../ai/workspace/workspace-doc-collab.repo";
import { verifyWorkspaceDocWsToken } from "../ai/workspace/workspace-doc-ws-token";

type WsContext = {
  ws: WebSocket;
  userId: number;
  userName: string | null;
  docId: string;
  workspaceId: string;
  clientId: string;
  role: "owner" | "admin" | "member" | "viewer";
  canWrite: boolean;
};

type DocMeta = {
  id: string;
  workspaceId: string;
};

type ClientMessage =
  | { type: "heartbeat" }
  | { type: "cursor"; cursor: WorkspaceDocCursor | null }
  | { type: "doc_op"; op: Record<string, unknown> | null }
  | { type: "yjs_update"; data: string }
  | { type: "yjs_sync"; data: string }
  | { type: "awareness"; data: string }
  | { type: "snapshot_response"; data: string };

type CursorRedisMessage = {
  type: "cursor";
  docId: string;
  workspaceId: string;
  userId: number;
  clientId: string;
  cursor: WorkspaceDocCursor | null;
  updatedAt: number;
  serverId?: string;
};

const SERVER_ID = process.env.INSTANCE_ID || randomUUID();
const WS_PRESENCE_TTL_SEC = DOC_PRESENCE_TTL_SEC;
const CHANNEL_PREFIX = "yua:wsdocs:v1:cursor:doc:";

const docClients = new Map<string, Map<string, WsContext>>();
const docSubRefCount = new Map<string, number>();
const docLastSnapshotAt = new Map<string, number>();
const docUpdateCount = new Map<string, number>();
let redisListenerAttached = false;

function safeSend(ws: WebSocket, payload: unknown) {
  if (ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify(payload));
}

function parseClientMessage(raw: string): ClientMessage | null {
  try {
    const parsed = JSON.parse(raw) as Partial<ClientMessage>;
    if (!parsed || typeof parsed !== "object") return null;
    if (parsed.type === "heartbeat") return { type: "heartbeat" };
    if (parsed.type === "cursor") {
      if (parsed.cursor == null) return { type: "cursor", cursor: null };
      if (
        typeof parsed.cursor === "object" &&
        typeof parsed.cursor.anchor === "number" &&
        typeof parsed.cursor.head === "number"
      ) {
        return {
          type: "cursor",
          cursor: {
            anchor: parsed.cursor.anchor,
            head: parsed.cursor.head,
          },
        };
      }
      return null;
    }
    if (parsed.type === "doc_op") {
      const op = parsed.op;
      if (op && typeof op === "object") {
        return { type: "doc_op", op: op as Record<string, unknown> };
      }
      return { type: "doc_op", op: null };
    }
    if (
      parsed.type === "yjs_update" &&
      typeof (parsed as any).data === "string"
    ) {
      return { type: "yjs_update", data: (parsed as any).data };
    }
    if (
      parsed.type === "yjs_sync" &&
      typeof (parsed as any).data === "string"
    ) {
      return { type: "yjs_sync", data: (parsed as any).data };
    }
    if (
      parsed.type === "awareness" &&
      typeof (parsed as any).data === "string"
    ) {
      return { type: "awareness", data: (parsed as any).data };
    }
    if (
      parsed.type === "snapshot_response" &&
      typeof (parsed as any).data === "string"
    ) {
      return { type: "snapshot_response" as any, data: (parsed as any).data };
    }
    return null;
  } catch {
    return null;
  }
}

async function resolveDocMeta(docId: string): Promise<DocMeta | null> {
  const q = await pgPool.query<{ id: string; workspace_id: string }>(
    `
      SELECT id, workspace_id
      FROM workspace_docs
      WHERE id = $1
        AND deleted_at IS NULL
      LIMIT 1
    `,
    [docId]
  );

  const row = q.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    workspaceId: row.workspace_id,
  };
}

async function authenticateFromUpgrade(req: http.IncomingMessage): Promise<{
  userId: number;
  userName: string | null;
}> {
  const url = new URL(req.url ?? "", "http://localhost");
  const token = url.searchParams.get("token");
  if (!token) throw new Error("token_required");

  const user = await getUserFromRequest({
    headers: {
      get(name: string) {
        if (name.toLowerCase() === "authorization") return `Bearer ${token}`;
        return null;
      },
    },
  });

  return {
    userId: user.userId,
    userName: user.name ?? null,
  };
}

function summarizeDocOp(op: Record<string, unknown> | null): string {
  if (!op || typeof op !== "object") return "doc_op";
  const kind = typeof op.kind === "string" ? op.kind : "doc_op";
  const baseVersion =
    typeof op.baseVersion === "number" && Number.isFinite(op.baseVersion)
      ? `@v${Math.floor(op.baseVersion)}`
      : "";
  const patchCount =
    Array.isArray(op.patches) ? `#${op.patches.length}` : "";
  const hasSnap = typeof op.ydocStateBase64 === "string" && op.ydocStateBase64.length > 0;
  const stem = `${kind}${baseVersion}${patchCount}`;
  return hasSnap ? `${stem}:snapshot` : stem;
}

function addClientToDoc(ctx: WsContext) {
  const existing = docClients.get(ctx.docId) ?? new Map<string, WsContext>();
  existing.set(ctx.clientId, ctx);
  docClients.set(ctx.docId, existing);
}

function removeClientFromDoc(ctx: WsContext) {
  const room = docClients.get(ctx.docId);
  if (!room) return;
  room.delete(ctx.clientId);
  if (room.size === 0) docClients.delete(ctx.docId);
}

function broadcastToDoc(
  docId: string,
  payload: unknown,
  opts?: { exceptClientId?: string }
) {
  const room = docClients.get(docId);
  if (!room) return;
  for (const [clientId, client] of room.entries()) {
    if (opts?.exceptClientId && opts.exceptClientId === clientId) continue;
    safeSend(client.ws, payload);
  }
}

async function publishPresenceSnapshot(docId: string) {
  const presence = await WorkspaceDocPresenceRedis.list(docId);
  broadcastToDoc(docId, {
    type: "presence_snapshot",
    docId,
    presence,
  });
}

async function subscribeDocChannel(docId: string) {
  await ensureRedisSubscriber();
  const prev = docSubRefCount.get(docId) ?? 0;
  if (prev === 0) {
    await redisSub.subscribe(workspaceDocCursorChannel(docId));
  }
  docSubRefCount.set(docId, prev + 1);
}

async function unsubscribeDocChannel(docId: string) {
  const prev = docSubRefCount.get(docId) ?? 0;
  if (prev <= 1) {
    docSubRefCount.delete(docId);
    await redisSub.unsubscribe(workspaceDocCursorChannel(docId));
    return;
  }
  docSubRefCount.set(docId, prev - 1);
}

function attachRedisCursorListenerOnce() {
  if (redisListenerAttached) return;
  redisListenerAttached = true;

  redisSub.on("message", (channel, message) => {
    if (!channel.startsWith(CHANNEL_PREFIX)) return;
    let payload: CursorRedisMessage;
    try {
      payload = JSON.parse(message) as CursorRedisMessage;
    } catch {
      return;
    }
    if (!payload || payload.type !== "cursor") return;
    if (payload.serverId && payload.serverId === SERVER_ID) return;

    broadcastToDoc(payload.docId, {
      type: "cursor",
      docId: payload.docId,
      workspaceId: payload.workspaceId,
      userId: payload.userId,
      clientId: payload.clientId,
      cursor: payload.cursor ?? null,
      updatedAt: payload.updatedAt ?? Date.now(),
    });
  });
}

export function attachWorkspaceDocsWebSocket(server: http.Server) {
  const wss = new WebSocketServer({ noServer: true, maxPayload: 512 * 1024 });
  attachRedisCursorListenerOnce();

  server.on("upgrade", async (req, socket, head) => {
    try {
      const url = new URL(req.url ?? "", "http://localhost");
      if (url.pathname !== "/ws/docs") return;

      const docId = url.searchParams.get("docId");
      if (!docId || !isUuid(docId)) throw new Error("doc_id_required");

      const doc = await resolveDocMeta(docId);
      if (!doc) throw new Error("doc_not_found");

      const reqWithWs = req as http.IncomingMessage & {
        wsAuth?: {
          userId: number;
          userName: string | null;
          docId: string;
          workspaceId: string;
          clientId: string;
          role: "owner" | "admin" | "member" | "viewer";
          canWrite: boolean;
        };
      };

      const token = url.searchParams.get("token") || "";
      let authUserId = 0;
      let authUserName: string | null = null;
      let role: "owner" | "admin" | "member" | "viewer" | null = null;

      if (token.includes(".")) {
        try {
          const wsClaims = verifyWorkspaceDocWsToken(token);
          if (wsClaims.docId !== docId) throw new Error("doc_mismatch");
          if (wsClaims.workspaceId !== doc.workspaceId) throw new Error("workspace_mismatch");
          authUserId = wsClaims.userId;
          role = wsClaims.role;
        } catch {
          role = null;
        }
      }

      if (!role) {
        const auth = await authenticateFromUpgrade(req);
        authUserId = auth.userId;
        authUserName = auth.userName;
        role = await WorkspaceAccess.getRole(doc.workspaceId, authUserId);
      }
      if (!role) throw new Error("workspace_membership_required");

      reqWithWs.wsAuth = {
        userId: authUserId,
        userName: authUserName,
        docId,
        workspaceId: doc.workspaceId,
        clientId: url.searchParams.get("clientId") || randomUUID(),
        role,
        canWrite: role !== "viewer",
      };

      wss.handleUpgrade(reqWithWs, socket, head, (ws) => {
        wss.emit("connection", ws, reqWithWs);
      });
    } catch {
      socket.destroy();
    }
  });

  wss.on("connection", async (ws, req) => {
    const reqWithWs = req as http.IncomingMessage & {
      wsAuth?: {
        userId: number;
        userName: string | null;
        docId: string;
        workspaceId: string;
        clientId: string;
        role: "owner" | "admin" | "member" | "viewer";
        canWrite: boolean;
      };
    };
    const auth = reqWithWs.wsAuth;
    if (!auth) {
      ws.close();
      return;
    }

    const ctx: WsContext = {
      ws,
      userId: auth.userId,
      userName: auth.userName,
      docId: auth.docId,
      workspaceId: auth.workspaceId,
      clientId: auth.clientId,
      role: auth.role,
      canWrite: auth.canWrite,
    };

    addClientToDoc(ctx);
    await subscribeDocChannel(ctx.docId);

    await WorkspaceDocPresenceRedis.upsert({
      docId: ctx.docId,
      workspaceId: ctx.workspaceId,
      userId: ctx.userId,
      clientId: ctx.clientId,
      displayName: ctx.userName,
      cursor: null,
      ttlSec: WS_PRESENCE_TTL_SEC,
    });

    await publishPresenceSnapshot(ctx.docId);

    safeSend(ws, {
      type: "hello",
      docId: ctx.docId,
      workspaceId: ctx.workspaceId,
      userId: ctx.userId,
      clientId: ctx.clientId,
      serverId: SERVER_ID,
      role: ctx.role,
      canWrite: ctx.canWrite,
    });

    ws.on("message", async (raw) => {
      const text = typeof raw === "string" ? raw : raw.toString("utf8");
      const msg = parseClientMessage(text);
      if (!msg) return;

      if (msg.type === "heartbeat") {
        await WorkspaceDocPresenceRedis.heartbeat({
          docId: ctx.docId,
          clientId: ctx.clientId,
          ttlSec: WS_PRESENCE_TTL_SEC,
        });
        return;
      }

      if (msg.type === "doc_op") {
        if (!ctx.canWrite) {
          safeSend(ws, {
            type: "error",
            code: "forbidden",
            message: "viewer_role_read_only",
          });
          return;
        }
        try {
          const op = msg.op ?? null;
          const stateHash =
            op && typeof op.stateHash === "string" ? op.stateHash : null;
          const ydocStateBase64 =
            op && typeof op.ydocStateBase64 === "string" ? op.ydocStateBase64 : null;
          const baseVersion =
            op && typeof op.baseVersion === "number" && Number.isFinite(op.baseVersion)
              ? Math.floor(op.baseVersion)
              : null;

          const persisted = await WorkspaceDocCollabRepo.persistDocOp({
            docId: ctx.docId,
            editorUserId: ctx.userId,
            summary: summarizeDocOp(op),
            stateHash,
            ydocStateBase64,
            baseVersion,
          });

          if (persisted.conflict) {
            safeSend(ws, {
              type: "error",
              code: "version_conflict",
              message: "stale_base_version",
              currentVersion: persisted.currentVersion ?? persisted.version,
            });
            return;
          }

          broadcastToDoc(ctx.docId, {
            type: "doc_ack",
            docId: ctx.docId,
            clientId: ctx.clientId,
            version: persisted.version,
            revisionId: persisted.revisionId,
            snapshotId: persisted.snapshotId,
            updatedAt: Date.now(),
          });
        } catch (e: any) {
          safeSend(ws, {
            type: "error",
            code: "persist_failed",
            message: e?.message ?? "persist_failed",
          });
        }
        return;
      }

      /* ── Y.js update (WAL: 즉시 persist + broadcast) ── */
      if (msg.type === "yjs_update") {
        if (!ctx.canWrite) {
          safeSend(ws, { type: "error", code: "forbidden", message: "viewer_role_read_only" });
          return;
        }
        try {
          const updateBuf = Buffer.from(msg.data, "base64");
          if (!updateBuf.length) return;

          // WAL: 즉시 DB에 append (crash-safe)
          await WorkspaceDocCollabRepo.appendUpdate(ctx.docId, updateBuf);

          // broadcast to other clients
          broadcastToDoc(
            ctx.docId,
            { type: "yjs_update", data: msg.data, clientId: ctx.clientId },
            { exceptClientId: ctx.clientId }
          );

          // compaction 체크 (비동기, 실패해도 무시)
          const count = (docUpdateCount.get(ctx.docId) ?? 0) + 1;
          docUpdateCount.set(ctx.docId, count);
          const lastSnap = docLastSnapshotAt.get(ctx.docId) ?? null;

          if (count >= 1000 || lastSnap === null || Date.now() - lastSnap >= 30_000) {
            // 클라이언트에게 snapshot 요청
            safeSend(ws, { type: "snapshot_request", docId: ctx.docId });
          }
        } catch (e: any) {
          log(`[yjs_update] persist error: ${e?.message}`);
        }
        return;
      }

      /* ── Y.js sync (initial sync step relay) ── */
      if (msg.type === "yjs_sync") {
        broadcastToDoc(
          ctx.docId,
          { type: "yjs_sync", data: msg.data, clientId: ctx.clientId },
          { exceptClientId: ctx.clientId }
        );
        return;
      }

      /* ── Y.js awareness (cursor/selection relay) ── */
      if (msg.type === "awareness") {
        broadcastToDoc(
          ctx.docId,
          { type: "awareness", data: msg.data, clientId: ctx.clientId },
          { exceptClientId: ctx.clientId }
        );
        return;
      }

      /* ── snapshot_response (클라이언트가 Y.Doc 전체 상태를 보내옴 → compaction) ── */
      if (msg.type === "snapshot_response") {
        try {
          const stateBuf = Buffer.from(msg.data, "base64");
          if (!stateBuf.length) return;

          const ver = await WorkspaceDocCollabRepo.getCurrentVersion(ctx.docId);
          const result = await WorkspaceDocCollabRepo.saveSnapshotAndCompact(
            ctx.docId,
            ver + 1,
            stateBuf,
            null,
            ctx.userId
          );

          docLastSnapshotAt.set(ctx.docId, Date.now());
          docUpdateCount.set(ctx.docId, 0);

          log(`[compaction] doc=${ctx.docId} v=${result.version} deleted=${result.deletedUpdates} updates`);
        } catch (e: any) {
          log(`[compaction] error: ${e?.message}`);
        }
        return;
      }

      /* ── cursor (기존 레거시 — 하위호환) ── */

      await WorkspaceDocPresenceRedis.upsert({
        docId: ctx.docId,
        workspaceId: ctx.workspaceId,
        userId: ctx.userId,
        clientId: ctx.clientId,
        displayName: ctx.userName,
        cursor: msg.cursor,
        ttlSec: WS_PRESENCE_TTL_SEC,
      });

      await WorkspaceDocPresenceRedis.publishCursor({
        docId: ctx.docId,
        workspaceId: ctx.workspaceId,
        userId: ctx.userId,
        clientId: ctx.clientId,
        cursor: msg.cursor,
        serverId: SERVER_ID,
      });

      broadcastToDoc(
        ctx.docId,
        {
          type: "cursor",
          docId: ctx.docId,
          workspaceId: ctx.workspaceId,
          userId: ctx.userId,
          clientId: ctx.clientId,
          cursor: msg.cursor,
          updatedAt: Date.now(),
        },
        { exceptClientId: ctx.clientId }
      );
    });

    const handleDisconnect = async () => {
      removeClientFromDoc(ctx);
      await WorkspaceDocPresenceRedis.remove({
        docId: ctx.docId,
        clientId: ctx.clientId,
      });
      await publishPresenceSnapshot(ctx.docId);
      await unsubscribeDocChannel(ctx.docId);

      // 마지막 클라이언트 퇴장 시 compaction 상태 정리
      const room = docClients.get(ctx.docId);
      if (!room || room.size === 0) {
        docLastSnapshotAt.delete(ctx.docId);
        docUpdateCount.delete(ctx.docId);
        // Note: flush는 클라이언트가 snapshot_response로 보내야 하므로
        // 마지막 클라이언트가 나갈 때는 이미 보냈거나, 다음 접속 시 loadDocState로 복구됨
      }
    };

    ws.on("close", handleDisconnect);
    ws.on("error", handleDisconnect);
  });

  log("📝 Workspace Docs WebSocket attached");
}
