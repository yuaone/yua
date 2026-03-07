// src/ai/plan/workspace-plan.service.ts
// 🔒 WorkspacePlanService — SSOT (Postgres)
// - Workspace 단위 tier 조회
// - Billing/Subscription 시스템과 분리 (권한 판단용 최소)

import { pgPool } from "../../db/postgres";

export type Tier = "free" | "pro" | "business" | "enterprise";

export const WorkspacePlanService = {
  async getTier(workspaceId: string): Promise<Tier> {
    // ✅ 최소 안전: 기본 free
    if (!workspaceId) return "free";

    // 1) workspace_plan_state 테이블이 있으면 그걸 SSOT로 사용
    // 2) 아직 없다면: 일단 free로 fallback (혹은 workspaces metadata로 확장)
    try {
      const { rows } = await pgPool.query<{ tier: Tier }>(
        `
        SELECT tier
        FROM workspace_plan_state
        WHERE workspace_id = $1
        LIMIT 1
        `,
        [workspaceId]
      );

      return (rows[0]?.tier ?? "free") as Tier;
    } catch (e) {
      // 테이블이 아직 없을 수 있으니 조용히 free로
      return "free";
    }
  },
};
