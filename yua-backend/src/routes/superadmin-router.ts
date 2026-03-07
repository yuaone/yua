// 📂 src/routes/superadmin-router.ts
// 🔥 YUA-AI SuperAdmin Router — OWNER MODE PROTECTED VERSION

import { Router } from "express";
import { SuperAdminController } from "../control/superadmin-controller";

// 🔥 Owner Mode Middlewares
import { ownerAuth } from "../middleware/owner-auth";
import { ownerModeGuard } from "../middleware/owner-mode-guard";

export const SuperAdminRouter = Router();

// 🛡 1) Owner 인증 1차 — 암호 + Key 검증
SuperAdminRouter.use(ownerAuth);

// 🛡 2) Owner 인증 2차 — MFA / OTP 확인
SuperAdminRouter.use(ownerModeGuard);

// 🧠 3) 실제 SuperAdmin Controller 연결
SuperAdminRouter.use("/", SuperAdminController);

export default SuperAdminRouter;
