// ===================================================================
// YUA Shell Server — FINAL VERSION (Cloud Run + WebSocket + HTTP API)
// ===================================================================

import { WebSocketServer } from "ws";
import { createServer } from "http";
import { createContext } from "../context/create-context";
import { YuaShellRuntime } from "../runtime/yua-shell";

// Cloud Run PORT handling
const PORT = Number(process.env.PORT || process.env.YUA_SHELL_PORT || 9000);

// -------------------------------------------------------------------
// 1) HTTP SERVER (Cloud Run's main entry)
// -------------------------------------------------------------------
const httpServer = createServer(async (req, res) => {
  // Health check
  if (req.method === "GET") {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("YUA Shell Runtime Active");
    return;
  }

  // Only POST /run is allowed
  if (req.method === "POST" && req.url === "/run") {
    try {
      // Read JSON body
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", async () => {
        try {
          const parsed = JSON.parse(body || "{}");
          const code = parsed.code?.trim() ?? "";

          const ctx = createContext("", "yua", false);
          const runtime = new YuaShellRuntime(ctx);

          const result = await runtime.execute(code);

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(result));
        } catch (err: any) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: false, error: err?.message ?? "Server error" }));
        }
      });
    } catch (err: any) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: false, error: err?.message ?? "Request failed" }));
    }
    return;
  }

  // Otherwise
  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not Found");
});

// -------------------------------------------------------------------
// 2) WEBSOCKET SERVER (same HTTP server)
// -------------------------------------------------------------------
const wss = new WebSocketServer({ server: httpServer });

console.log(`🚀 Starting YUA Shell Server (HTTP + WS) on :${PORT}`);

wss.on("connection", (ws) => {
  const ctx = createContext("", "yua", false);
  const runtime = new YuaShellRuntime(ctx);

  ws.send(
    [
      "⚛️ YUA Shell connected (WebSocket mode).",
      "Type `help` to see available commands.",
      "",
    ].join("\n")
  );

  ws.on("message", async (msg) => {
    const input = msg.toString().trim();
    if (!input) return;

    try {
      const result = await runtime.execute(input);
      ws.send(JSON.stringify({ ok: result.ok, output: result.output, meta: result.meta }));
    } catch (err: any) {
      ws.send(JSON.stringify({ ok: false, error: err?.message ?? "Runtime error" }));
    }
  });

  ws.on("close", () => console.log("🔌 WS Client disconnected"));
  ws.on("error", (err) => console.error("WS Error:", err));
});

// -------------------------------------------------------------------
// 3) START SERVER
// -------------------------------------------------------------------
httpServer.listen(PORT, () => {
  console.log(`✅ YUA Shell Server running (HTTP + WS) at http://0.0.0.0:${PORT}`);
});
