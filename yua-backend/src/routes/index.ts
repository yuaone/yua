// 📂 src/routes/index.ts
// 🔥 YUA-AI Engine — Root Router MASTER FINAL (SSOT FIXED)

import { Router } from "express";
import { requireFirebaseAuth } from "../auth/auth.express";
import { withWorkspace } from "../middleware/with-workspace";
/* ==============================
   SYSTEM / SECURITY
============================== */
import { checkUsageLimit } from "../middleware/check-usage";
import { attackMonitor } from "../middleware/attack-monitor";
import { autoEngineDB } from "../middleware/auto-engine-db";
import { aiEngineLimiter } from "../middleware/engine-limiter";
import { rateLimit } from "../middleware/rate-limit";

/* ==============================
   ROOT / AUTH
============================== */
import healthRouter from "./health-router";
import authRouter from "./auth-router";
import meRouter from "./me-router";
import usageRouter from "./usage";

/* ==============================
   CHAT (SSOT)
============================== */
// 🔥 Firebase ONLY — User Chat Resource
import chatUserRouter from "./chat-user.router";
import chatUploadRouter from "./chat-upload.router";
import projectRouter from "./project.router";

// 🔒 Legacy / Completion Chat
import chatRouter from "./chat-router";
import streamAbortRouter from "./stream-abort";
/* ==============================
   OTHER ROUTERS (생략 없음)
============================== */
import financeRouter from "./finance-router";
import bizRouter from "./biz-router";
import riskRouter from "./risk-router";
import reportRouter from "./report-router";
import matchRouter from "./match-router";
import aiRouter from "./ai-router";
import researchRouter from "./research-router";
import docRouter from "./doc-router";
import securityRouter from "./security-router";
import identityRouter from "./identity-router";
import agentRouter from "./agent-router";
import documentRouter from "./document-router";
import taskRouter from "./task-router";
import videoRouter from "./video-router";
import audioRouter from "./audio-router";
import decisionRouter from "./decision-router";
import quantumRouter from "./quantum-router";
import quantumV2Router from "./quantum-v2-router";
import evalRouter from "./eval-router";
import secureRouter from "./secure-router";
import codeRouter from "./code-router";
import reasoningRouter from "./reasoning-router";
import WorkflowRouter from "./workflow-router";
import LogsRouter from "./logs-router";
import SettingsRouter from "./settings-router";
import ApiKeyRouter from "./api-key-router";
import DevRouter from "./dev-router";
import SuperAdminRouter from "./superadmin-router";
import auditRouter from "./audit-router";
import EngineRouter from "./engine-router";
import mysqlTestRouter from "./mysql-test-router";
import vectorRouter from "./vector-router";
import postgresRouter from "./postgres-router";
import emotionRouter from "./emotion-router";
import styleRouter from "./style-router";
import compressRouter from "./compress-router";
import threatRouter from "./threat-router";
import attackRouter from "./attack-router";
import controlRouter from "./control-router";
import billingRouter from "./billing-router";
import billingStatusRouter from "./billing-status-router";
import businessRouter from "./business-router";
import InstanceRouter from "./instance-router";
import terminalRouter from "./terminal-router";
import fsRouter from "./fs-router";
import { hpeRouter } from "./hpe-router";
import { hpe4Router } from "./hpe4-router";
import { hpe5Router } from "./hpe5-router";
import { hpe7Router } from "./hpe7-router";
import YuaBasicRouter from "./yua/basic-router";
import YuaProRouter from "./yua/pro-router";
import YuaSpineRouter from "./yua/spine-router";
import YuaAssistantRouter from "./yua/assistant-router";
import YuaDevRouter from "./yua/dev-router";
import assetRouter from "./asset-router";
import uploadAssetsRouter from "./upload-assets.router";
import studioRouter from "./studio-router";
import sectionAssetsRouter from "./section-assets.router";
import workspaceMeRouter from "./workspace-me-router";
import workspaceRouter from "./workspace-router";
import voiceRouter from "./voice-router";
import shareRouter from "./share-router";
import memoryRouter from "./memory-router";

/* ================================================== */
const router = Router();
console.log("[ROUTER] index.ts loaded");

/* ==================================================
   🔓 PUBLIC
================================================== */
router.use("/health", healthRouter);
router.use("/auth", rateLimit, authRouter);
router.use("/", shareRouter);  // GET /share/:token (public) + POST /chat/share (auth inside)

/* ==================================================
   🔑 ADMIN / DEV (auth + rate limit required)
================================================== */
router.use("/key", requireFirebaseAuth, rateLimit, ApiKeyRouter);
router.use("/dev", requireFirebaseAuth, rateLimit, DevRouter);
router.use("/superadmin", requireFirebaseAuth, rateLimit, SuperAdminRouter);
router.use("/audit", requireFirebaseAuth, rateLimit, auditRouter);

/* ==================================================
   🔧 ENGINE / DB CONTEXT (🔥 반드시 먼저)
================================================== */
router.use(autoEngineDB);

/* ==================================================
   👤 AUTH CONTEXT (🔥 반드시 chat 전에)
================================================== */
router.use("/me", meRouter);
router.use("/usage", requireFirebaseAuth, usageRouter);
router.use("/workspace/me", workspaceMeRouter);
/* ==================================================
   ✅ USER CHAT (Firebase SSOT)
   👉 /api/chat/*
================================================== */
 // ✅ chatController가 req.workspace를 요구하므로, chat 라우트는 auth 후 withWorkspace를 보장해야 함
 router.use("/chat", requireFirebaseAuth, withWorkspace, chatRouter);
 router.use("/chat", requireFirebaseAuth, chatUserRouter);
 router.use("/chat", requireFirebaseAuth, withWorkspace, chatUploadRouter);
 
  /* ==================================================
   📊 CHAT TELEMETRY
   👉 /api/chat/suggestion/feedback
================================================== */
router.use("/telemetry", controlRouter);

 /* ==================================================
   🛑 STREAM CONTROL (SSOT)
   👉 /api/chat/stream/abort
================================================== */
router.use("/chat/stream", streamAbortRouter);

 /* ==================================================
   🧠 MEMORY API (Firebase + Workspace)
   👉 /api/memory/*
================================================== */
router.use("/memory", requireFirebaseAuth, withWorkspace, memoryRouter);

 /* ==================================================
   📁 PROJECT (Workspace / Sidebar Context)
   👉 /api/project/*
================================================== */
router.use("/project", projectRouter);
router.use("/workspace", workspaceRouter);
 /* ==================================================
   📄 DOCUMENT (Rewrite / Assets)
   👉 /api/document/*
   ❌ usage / engine limiter 없음
================================================== */
router.use("/document", documentRouter);

/* ==================================================
   🔒 API KEY REQUIRED
================================================== */
router.use("/assets", uploadAssetsRouter);
router.use("/assets",  assetRouter);
router.use(
  "/sections",
  sectionAssetsRouter
);
router.use(
  "/studio",
  requireFirebaseAuth,
  withWorkspace,
  studioRouter
);
router.use("/finance", checkUsageLimit, financeRouter);
router.use("/biz", checkUsageLimit, bizRouter);
router.use("/risk", checkUsageLimit, riskRouter);
router.use("/report", checkUsageLimit, reportRouter);
router.use("/match", checkUsageLimit, matchRouter);
router.use("/ai", checkUsageLimit, aiRouter);

/* YUA 5-MODE */
router.use("/ai/basic", checkUsageLimit, YuaBasicRouter);
router.use("/ai/pro", checkUsageLimit, YuaProRouter);
router.use("/ai/spine", checkUsageLimit, YuaSpineRouter);
router.use("/ai/assistant", checkUsageLimit, YuaAssistantRouter);
router.use("/ai/dev", checkUsageLimit, YuaDevRouter);

/* MULTI ENGINE */
router.use("/research", aiEngineLimiter, researchRouter);
router.use("/doc", aiEngineLimiter, docRouter);
router.use("/security", aiEngineLimiter, securityRouter);
router.use("/identity", aiEngineLimiter, identityRouter);
router.use("/agent", aiEngineLimiter, agentRouter);
router.use("/task", aiEngineLimiter, taskRouter);
router.use("/video", aiEngineLimiter, videoRouter);
router.use("/audio", aiEngineLimiter, audioRouter);
router.use("/voice", voiceRouter);
router.use("/decision", aiEngineLimiter, decisionRouter);

/* QUANTUM */
router.use("/quantum", checkUsageLimit, quantumRouter);
router.use("/quantum-v2", checkUsageLimit, quantumV2Router);

/* ENGINE / DB (auth required) */
router.use("/engine", requireFirebaseAuth, EngineRouter);
router.use("/mysql", requireFirebaseAuth, mysqlTestRouter);
router.use("/vector", requireFirebaseAuth, vectorRouter);
router.use("/postgres", requireFirebaseAuth, postgresRouter);
router.use("/emotion", emotionRouter);
router.use("/style", styleRouter);
router.use("/compress", compressRouter);

/* THREAT */
router.use("/threat", threatRouter);
router.use(attackMonitor);
router.use("/attack", attackRouter);

/* BUSINESS */
router.use("/billing", requireFirebaseAuth, withWorkspace, billingStatusRouter);
router.use("/billing", requireFirebaseAuth, withWorkspace, billingRouter);
router.use("/business", businessRouter);

/* INSTANCE / FS (auth + rate limit — infrastructure access) */
router.use("/instance", requireFirebaseAuth, rateLimit, InstanceRouter);
router.use("/terminal", requireFirebaseAuth, rateLimit, terminalRouter);
router.use("/fs", requireFirebaseAuth, rateLimit, fsRouter);

/* HPE */
router.use("/hpe", checkUsageLimit, hpeRouter);
router.use("/hpe4", checkUsageLimit, hpe4Router);
router.use("/hpe5", checkUsageLimit, hpe5Router);
router.use("/hpe7", checkUsageLimit, hpe7Router);

/* ROOT */
router.get("/", (_req, res) => {
  res.json({
    ok: true,
    engine: "YUA-Core",
    status: "running",
    timestamp: new Date().toISOString(),
  });
});

export default router;
