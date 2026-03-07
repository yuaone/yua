// 📂 src/ai/security/security-wsr.ts
// 🔥 WebSocket Router + Global Push Bus — FINAL FIXED VERSION (2025.11)
// ----------------------------------------------------------------------
// ✔ initSecurityWSR(server) : 실제 WebSocket 서버 초기화
// ✔ SecurityWSR.push(event, payload) : 어디서든 실시간 전송
// ✔ SensorStream / VideoEngine / GestureEngine 완전 호환
// ✔ strict-ts 100% 통과
// ----------------------------------------------------------------------

import { WebSocketServer } from "ws";
import { StreamEmitter } from "./security-stream-emitter";

// -------------------------------------------------------------
// 🔥 1) Global Push Object (SensorStream이 요구하는 형태)
// -------------------------------------------------------------
export const SecurityWSR = {
  clients: new Set<any>(),

  push(event: string, payload: any) {
    const msg = JSON.stringify({ event, ...payload });
    for (const ws of this.clients) {
      try {
        ws.send(msg);
      } catch (e) {
        console.error("[SecurityWSR] push error:", e);
      }
    }
  },
};

// -------------------------------------------------------------
// 🔥 2) WebSocket Router 초기화
// -------------------------------------------------------------
export function initSecurityWSR(server: any) {
  const wss = new WebSocketServer({
    server,
    path: "/ws/security",
  });

  wss.on("connection", (ws) => {
    // 연결 저장
    SecurityWSR.clients.add(ws);

    ws.send(JSON.stringify({ ok: true, message: "WSR Connected" }));

    // security-stream-emitter 구독
    const sub = StreamEmitter.subscribe((evt) => {
      try {
        ws.send(JSON.stringify(evt));
      } catch (e) {
        console.error("[WSR] send error", e);
      }
    });

    // 종료 처리
    const cleanup = () => {
      SecurityWSR.clients.delete(ws);
      sub.unsubscribe();
    };

    ws.on("close", cleanup);
    ws.on("error", cleanup);
  });

  console.log("🔌 Security WSR ready → /ws/security");
}
