// 📂 src/ai/project/project-context.ts
// 🔒 ProjectContextEngine — SSOT FINAL (Postgres)
// --------------------------------------------------
// ✔ Workspace 내부 Project 컨텍스트 확정
// ✔ Project 없는 Workspace 허용
// ✔ 검증 실패 시 downgrade (throw ❌)
// ✔ PostgreSQL SSOT
// ✔ Controller 전용
// --------------------------------------------------

import { pgPool } from "../../db/postgres";

/* ===================================================
   Types (SSOT)
================================================== */

export type ProjectContextResult = {
  projectId: string | null;
  isDefault: boolean;
};

interface ProjectRow {
  id: string;
  workspace_id: string;
}

/* ===================================================
   ProjectContextEngine
================================================== */

export const ProjectContextEngine = {
  async resolve(params: {
    workspaceId: string;
    projectId?: string | null;
  }): Promise<ProjectContextResult> {
    const { workspaceId, projectId } = params;

    // 0️⃣ projectId 없으면 → General
    if (!projectId || typeof projectId !== "string") {
      return { projectId: null, isDefault: true };
    }

    // UUID 최소 길이 가드 (noise 방지)
    if (projectId.trim().length < 8) {
      return { projectId: null, isDefault: true };
    }

    try {
      const { rows } = await pgPool.query<ProjectRow>(
        `
        SELECT id, workspace_id
        FROM projects
        WHERE id = $1
        LIMIT 1
        `,
        [projectId]
      );

      if (rows.length === 0) {
        return { projectId: null, isDefault: true };
      }

      const project = rows[0];

      // 🔒 Workspace boundary 엄수
      if (project.workspace_id !== workspaceId) {
        return { projectId: null, isDefault: true };
      }

      return {
        projectId: project.id,
        isDefault: false,
      };
    } catch (error) {
      // ❌ throw 금지 — 무조건 downgrade
      console.error("[ProjectContextEngine][PG] resolve failed", {
        workspaceId,
        projectId,
        error,
      });

      return { projectId: null, isDefault: true };
    }
  },
};
