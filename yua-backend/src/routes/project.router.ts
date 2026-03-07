// src/routes/project.router.ts
import { Router } from "express";
import { requireAuthOrApiKey } from "../auth/auth-or-apikey";
import { WorkspaceContext } from "../ai/workspace/workspace-context";
import { WorkspaceAccess } from "../ai/workspace/workspace-access";
import { WorkspacePlanService } from "../ai/plan/workspace-plan.service";
import { PlanGuard } from "../ai/plan/plan-guard";
import { ProjectEngine } from "../ai/project/project-engine"; // ✅ PG 단일화
import { ProjectContextEngine } from "../ai/project/project-context";
import { isUuid } from "../utils/is-uuid";
import { tierToPlan } from "yua-shared";
import { PLAN_LIMITS } from "yua-shared";

const router = Router();
router.use(requireAuthOrApiKey);

/* ==================================================
   Workspace Resolver (SSOT)
================================================== */
async function resolveWorkspace(req: any, userId: number) {
  const headerWs = req.headers["x-workspace-id"];

  console.log("[WORKSPACE][HEADER]", headerWs);

  if (isUuid(headerWs)) {
    const role = await WorkspaceAccess.getRole(headerWs, userId);
    if (role) return { workspaceId: headerWs, role };
    // D3 fix: explicit workspace ID with no access → reject instead of silent fallback
    const err: any = new Error("workspace_access_denied");
    err.status = 403;
    throw err;
  }

  const ctx = await WorkspaceContext.resolve({ userId });
  console.log("[WORKSPACE][RESOLVED]", {
    workspaceId: ctx.workspaceId,
    role: ctx.role,
  });
  return { workspaceId: ctx.workspaceId, role: ctx.role };
}

/* ==================================================
   GET /api/project
================================================== */
router.get("/", async (req: any, res) => {
  try {
    const userId: number | undefined = req.user?.userId;
    if (!userId) return res.status(401).json({ ok: false });

    const { workspaceId } = await resolveWorkspace(req, userId);

    const projects = await ProjectEngine.listProjects({
      workspaceId,
      userId,
    });

    return res.json({
      ok: true,
      projects: projects.map((p) => ({
        id: p.id,
        name: p.name,
        role: p.role,
      })),
    });
  } catch (e: any) {
    console.error("[PROJECT][LIST]", e);
    return res.status(e.status ?? 500).json({ ok: false, error: e.message });
  }
});

/* ==================================================
   POST /api/project
================================================== */
router.post("/", async (req: any, res) => {
  try {
    const userId: number | undefined = req.user?.userId;
    if (!userId) return res.status(401).json({ ok: false });

    const name = String(req.body?.name ?? "").trim();
    if (!name) {
      return res.status(400).json({ ok: false, error: "invalid_name" });
    }
    const useMemory = req.body?.useMemory === true;

    const { workspaceId } = await resolveWorkspace(req, userId);

    // 🔒 Plan Guard
    const tier = await WorkspacePlanService.getTier(workspaceId);
    const projectCount = await ProjectEngine.countProjects({
      workspaceId,
      userId,
    });
    const plan = tierToPlan(tier);
    const limit = PLAN_LIMITS[plan].maxProjects;

    console.log("[PROJECT][TRACE]", {
      userId,
      workspaceId,
      tier,
      plan,
      projectCount,
      limit,
    });

   // 🔍 RUNTIME SHARED DEBUG
    console.log("[PROJECT][SHARED][RESOLVE]", require.resolve("yua-shared"));

    console.log("[PROJECT][SHARED][PLAN_LIMITS RAW]", PLAN_LIMITS);

    console.log("[PROJECT][SHARED][PLAN_LIMITS ENTRY]", {
      plan,
      entry: PLAN_LIMITS[plan],
      maxProjects: PLAN_LIMITS[plan]?.maxProjects,
      type: typeof PLAN_LIMITS[plan]?.maxProjects,
    });


    const access = PlanGuard.assertProjectAccess(tier);
    if (!access.ok) {
      return res.status(403).json({ ok: false, error: access.error });
    }

    const createGuard = PlanGuard.assertProjectCreate(tier, projectCount);
    if (!createGuard.ok) {
      return res.status(403).json({ ok: false, error: createGuard.error });
    }

    const project = await ProjectEngine.createProject({
      workspaceId,
      userId,
      name,
      useMemory,
    });

    if (!project) {
      return res.status(400).json({ ok: false, error: "project_create_failed" });
    }

    return res.json({
      ok: true,
      project: {
        id: project.id,
        name: project.name,
        useMemory: project.useMemory,
      },
    });
  } catch (e: any) {
    console.error("[PROJECT][CREATE]", e);
    return res.status(e.status ?? 500).json({ ok: false, error: e.message });
  }
});

/* ==================================================
   GET /api/project/:id
================================================== */
router.get("/:id", async (req: any, res) => {
  try {
    const userId: number | undefined = req.user?.userId;
    if (!userId) return res.status(401).json({ ok: false });

    const projectId = String(req.params.id);
    const { workspaceId } = await resolveWorkspace(req, userId);

    // ✅ SSOT: projectId validation must go through ProjectContextEngine
    const ctx = await ProjectContextEngine.resolve({
      workspaceId,
      projectId,
    });
    if (!ctx.projectId) {
      return res.status(403).json({ ok: false });
    }

    // ✅ membership validation (project_members)
    const project = await ProjectEngine.getProject({
      workspaceId,
      projectId: ctx.projectId,
      userId,
    });
    if (!project) return res.status(403).json({ ok: false });

    return res.json({
      ok: true,
      project,
    });
  } catch (e: any) {
    console.error("[PROJECT][GET]", e);
    return res.status(e.status ?? 500).json({ ok: false, error: e.message });
  }
});

export default router;
