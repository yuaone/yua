// 📂 src/api/control/asset-controller.ts
// 🔒 Asset Controller — SSOT FINAL (PLAN creates asset row)

import type { Request, Response } from "express";
import { AssetPlanner } from "../ai/asset/planner/asset-planner";
import { AssetExecutor } from "../ai/asset/execution/asset-executor";
import type { AssetExecutionRequest } from "../ai/asset/execution/asset-execution.types";
import { judgmentRegistry } from "../ai/judgment/judgment-singletons";
import { pgPool } from "../db/postgres"; // ✅ 추가

export const assetController = {
  /* -------------------------------------------------- */
  /* POST /api/assets/plan                              */
  /* -------------------------------------------------- */
  async plan(req: Request, res: Response) {
    const { input } = req.body ?? {};
    const userId = (req as any).user?.id ?? 1;
    const workspaceId = (req as any).workspaceId ?? "default-workspace";

    if (!input || typeof input !== "string") {
      return res.status(400).json({
        ok: false,
        error: "invalid_input",
      });
    }

    /* --------------------------------------------------
     * 1️⃣ Planner (ID 생성은 여기서)
     * -------------------------------------------------- */
    const plan = AssetPlanner.plan({
      input,
      workspaceId,
      userId,
    });

    const assetId = plan.asset.id;
    const assetType = plan.asset.type;

    /* --------------------------------------------------
     * 2️⃣ 🔒 ASSET ROW 생성 (중복 안전)
     * -------------------------------------------------- */
    await pgPool.query(
      `
      INSERT INTO assets (
        id,
        workspace_id,
        asset_type,
        status,
        current_version,
        created_by,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, 'DRAFT', 0, $4, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
      `,
      [assetId, workspaceId, assetType, userId]
    );

    return res.status(200).json({
      ok: true,
      plan,
    });
  },

  /* -------------------------------------------------- */
  /* POST /api/assets/judge                             */
  /* -------------------------------------------------- */
  async judge(req: Request, res: Response) {
    const { plan } = req.body ?? {};

    if (!plan || !plan.judgmentPayload) {
      return res.status(400).json({
        ok: false,
        error: "invalid_plan",
      });
    }

    const decision = await judgmentRegistry.evaluate({
      path: "NORMAL",
      rawInput: plan.judgmentPayload.reason,
      persona: { role: "system" },
      priority: "NORMAL",
      requiresGPU: false,
      traceId: `trace-${Date.now()}`,
    });

    return res.status(200).json({
      ok: true,
      verdict: decision.verdict,
      confidence: decision.confidence,
    });
  },

  /* -------------------------------------------------- */
  /* POST /api/assets/execute                           */
  /* -------------------------------------------------- */
  async execute(req: Request, res: Response) {
    // ✅ validateAssetExecution 미들웨어 우선 사용
    const body =
      ((req as any).validatedAssetExecution as AssetExecutionRequest | undefined) ??
      (req.body as AssetExecutionRequest);

    if (!body || body.judgmentVerdict !== "APPROVE") {
      return res.status(403).json({
        ok: false,
        error: "execution_blocked",
      });
    }

    const executor = new AssetExecutor();
    const result = await executor.run(body);

    return res.status(200).json({
      ok: true,
      result,
    });
  },
};
