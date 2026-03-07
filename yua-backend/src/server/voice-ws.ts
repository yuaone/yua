import type http from "http";
import WebSocket, { WebSocketServer } from "ws";
import { verifyVoiceWsToken } from "../ai/voice/voice-ws-token";
import { VoiceSessionRepo } from "../ai/voice/voice-session.repo";
import { VoiceSessionEngine } from "../ai/voice/voice-session.engine";

export function attachVoiceWebSocket(server: http.Server) {
  const wss = new WebSocketServer({ noServer: true, maxPayload: 8 * 1024 * 1024 });
  const engine = new VoiceSessionEngine();

server.on(
  "upgrade",
  async (
    req: import("http").IncomingMessage,
    socket,
    head
  ) => {
    try {
      const url = new URL(req.url ?? "", "http://localhost");
      if (url.pathname !== "/ws/voice") return;

      const token = url.searchParams.get("token");
      if (!token) throw new Error("token_required");

      const claims = verifyVoiceWsToken(token);
      const session = await VoiceSessionRepo.get(claims.sessionId);
      if (!session || session.status !== "ACTIVE") throw new Error("session_not_found");

      wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit("connection", ws, req, claims);
      });
    } catch {
      socket.destroy();
    }
  });

wss.on("connection", async (
  ws: WebSocket,
  _req: import("http").IncomingMessage,
  claims: { sessionId: string }
) => {
    const session = await VoiceSessionRepo.get(claims.sessionId);
    if (!session) {
      ws.close();
      return;
    }

    await engine.handleConnection({
      ws,
      session,
      personaHint: "말투: 밝고 하이텐션. 짧고 또렷하게. 한국어 우선.",
    });
  });
}