// 📂 src/server/server.ts
// 🔥 YA-ENGINE SERVER — SSE SAFE FINAL (2025.12)

import "express-async-errors";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

/* ---------------------------------------------------------
 * DB
 * ------------------------------------------------------- */
import "../db/firebase";
import "../db/mysql";
import { initializePostgres } from "../db/postgres";

/* ---------------------------------------------------------
 * ROUTERS
 * ------------------------------------------------------- */
import router from "../routes";
import healthRouter from "../routes/health-router";
import streamRouter from "../routes/stream-router";

import { AiGateway } from "./api-gateway";

/* ---------------------------------------------------------
 * DOCS / LOG
 * ------------------------------------------------------- */
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "../docs/swagger-loader";
import { log, logError } from "../utils/logger";
import "../ai/judgment/judgment-singletons";
import { loadJudgmentRules } from "../ai/judgment/judgment-persistence";
import { assetErrorHandler } from "../api/middleware/asset-error-handler";
import http from "http";
import { attachVoiceWebSocket } from "./voice-ws";
import { attachWorkspaceDocsWebSocket } from "./workspace-docs-ws";
const app = express();

/* ---------------------------------------------------------
 * 🔥 FIX 0: proxy 환경 신뢰 (Next.js rewrite 필수)
 * ------------------------------------------------------- */
app.set("trust proxy", true);

/* ---------------------------------------------------------
 * 🔥 FIX 1: ETag 완전 비활성화 (SSE buffering 원인)
 * ------------------------------------------------------- */
app.disable("etag");

/* ---------------------------------------------------------
 * SECURITY
 * ------------------------------------------------------- */
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  })
);

/* ---------------------------------------------------------
 * 🔥 FIX 2: SSE 전역 버퍼링 차단 (proxy / nginx / dev-server)
 * ------------------------------------------------------- */
app.use((req, res, next) => {
  res.setHeader("X-Accel-Buffering", "no");
  next();
});

/* ---------------------------------------------------------
 * PARSER / LOGGER
 * ------------------------------------------------------- */
/**
 * ⚠️ body parser는 SSE GET 요청에 영향 없음
 *     (POST /api/chat 이후 GET /stream 이므로 안전)
 */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

/* ---------------------------------------------------------
 * DB INIT
 * ------------------------------------------------------- */
initializePostgres()
  .then(() => log("🟢 PostgreSQL Initialized"))
  .catch((err) => logError("❌ PostgreSQL Init Error", err));

/* ---------------------------------------------------------
 * 🔒 JUDGMENT RULE LOAD (ON BOOT, SSOT)
 * ------------------------------------------------------- */
loadJudgmentRules();
log("🧠 Judgment Rules Loaded");

/* ---------------------------------------------------------
 * DOCS
 * ------------------------------------------------------- */
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get("/api/docs.json", (_req, res) => res.json(swaggerSpec));

/* ---------------------------------------------------------
 * AI GATEWAY (JSON)
 * ------------------------------------------------------- */
app.post("/api/yua", (req, res) => {
  return AiGateway.handle(req, res);
});

/* ---------------------------------------------------------
 * HEALTH
 * ------------------------------------------------------- */
app.use("/api/health", healthRouter);

/* ---------------------------------------------------------
 * 🔥 SSE ROUTES (반드시 JSON router 보다 먼저)
 * ------------------------------------------------------- */

/* Legacy / SSOT / Alias — 전부 유지 */
app.use("/api/stream", streamRouter);
app.use("/api/chat/stream", streamRouter);

app.use("/chat/stream", streamRouter);
app.use("/stream", streamRouter);

/* ---------------------------------------------------------
 * JSON APIs
 * ------------------------------------------------------- */
app.use("/api", router);

/* ---------------------------------------------------------
 * ASSET DOMAIN ERROR (🔥 반드시 404 이전)
 * ------------------------------------------------------- */
app.use(assetErrorHandler);

/* ---------------------------------------------------------
 * 404
 * ------------------------------------------------------- */
app.use((_req, res) => {
  res.status(404).json({
    ok: false,
    message: "Endpoint Not Found",
  });
});

/* ---------------------------------------------------------
 * GLOBAL ERROR
 * ------------------------------------------------------- */
app.use((err: any, _req: any, res: any, _next: any) => {
  logError("🔥 Global Error", err);
  res.status(500).json({
    ok: false,
    error: err?.message ?? "Internal Server Error",
  });
});

/* ---------------------------------------------------------
 * START
 * ------------------------------------------------------- */
const PORT = 4000;

const server = http.createServer(app);

attachVoiceWebSocket(server);
attachWorkspaceDocsWebSocket(server);

server.listen(PORT, "0.0.0.0", () => {
  log(`🚀 YUA-ENGINE LIVE on http://0.0.0.0:${PORT}`);
  log("🎙 Voice WebSocket attached");
  log("📝 Workspace Docs WebSocket attached");
});

export default app;
