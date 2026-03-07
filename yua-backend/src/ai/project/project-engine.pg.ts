// src/ai/project/project-engine.pg.ts
// 🔒 ProjectEngine — SSOT (Postgres)
// - projects / project_members 는 이미 PG에 존재
// - throw ❌ → null / [] 반환

import { pgPool } from "../../db/postgres";
import type { WorkspaceRole } from "../workspace/workspace-access";

export type ProjectRole = "owner" | "editor" | "viewer";


export type ProjectListItem = {
  id: string;
  name: string;
  role: ProjectRole;
  createdAt: number;
};

/* =========================
   Internal Helper
========================= */

async function hasWorkspaceAccess(
  workspaceId: string,
  userId: number
): Promise<WorkspaceRole | null> {
  const { rows } = await pgPool.query<{ role: WorkspaceRole }>(
    `
    SELECT role
    FROM workspace_users
    WHERE workspace_id = $1 AND user_id = $2
    LIMIT 1
    `,
    [workspaceId, userId]
  );

  return rows[0]?.role ?? null;
}

/* =========================
   Engine (SSOT)
========================= */

export const ProjectEnginePG = {
  /* --------------------------------------------------
     Count
  -------------------------------------------------- */
  async countProjects(params: {
    workspaceId: string;
    userId: number;
  }): Promise<number> {
    const { workspaceId, userId } = params;
    if (!workspaceId || !userId) return 0;

    const { rows } = await pgPool.query<{ cnt: string }>(
      `
      SELECT COUNT(*)::text as cnt
      FROM projects p
      JOIN project_members pm ON pm.project_id = p.id
      WHERE p.workspace_id = $1
        AND pm.user_id = $2
      `,
      [workspaceId, userId]
    );

    return Number(rows[0]?.cnt ?? 0);
  },

  /* --------------------------------------------------
     Membership Check (🔥 ThreadEngine에서 사용)
  -------------------------------------------------- */
  async isProjectMember(params: {
    projectId: string;
    userId: number;
  }): Promise<boolean> {
    const { projectId, userId } = params;
    if (!projectId || !userId) return false;

    const { rows } = await pgPool.query(
      `
      SELECT 1
      FROM project_members
      WHERE project_id = $1
        AND user_id = $2
      LIMIT 1
      `,
      [projectId, userId]
    );

    return rows.length > 0;
  },

  /* --------------------------------------------------
     Project Role
  -------------------------------------------------- */
  async getUserProjectRole(params: {
    projectId: string;
    userId: number;
  }): Promise<ProjectRole | null> {
    const { rows } = await pgPool.query<{ role: ProjectRole }>(
      `
      SELECT role
      FROM project_members
      WHERE project_id = $1
        AND user_id = $2
      LIMIT 1
      `,
      [params.projectId, params.userId]
    );

    return rows[0]?.role ?? null;
  },

  /* --------------------------------------------------
     Create
  -------------------------------------------------- */
  async createProject(params: {
    workspaceId: string;
    userId: number;
    name: string;
    useMemory?: boolean;
  }): Promise<{ id: string; name: string; useMemory: boolean } | null> {
    const { workspaceId, userId, name, useMemory = false } = params;
    if (!workspaceId || !userId || !name.trim()) return null;

    const role = await hasWorkspaceAccess(workspaceId, userId);
    if (!role || role === "viewer") return null;

    const client = await pgPool.connect();
    try {
      await client.query("BEGIN");

      const { rows } = await client.query<{
        id: string;
        name: string;
        use_memory: boolean;
        created_at: string;
      }>(
        `
        INSERT INTO projects (workspace_id, name, created_by_user_id, use_memory)
        VALUES ($1, $2, $3, $4)
        RETURNING id, name, use_memory, created_at
        `,
        [workspaceId, name.trim(), userId, useMemory]
      );

      const project = rows[0];
      if (!project?.id) {
        await client.query("ROLLBACK");
        return null;
      }

      await client.query(
        `
        INSERT INTO project_members (project_id, user_id, role)
        VALUES ($1, $2, 'owner')
        ON CONFLICT DO NOTHING
        `,
        [project.id, userId]
      );

      await client.query("COMMIT");
      return { id: project.id, name: project.name, useMemory: project.use_memory };
    } catch (e) {
      try { await client.query("ROLLBACK"); } catch {}
      console.error("[ProjectEnginePG.createProject]", e);
      return null;
      } finally {
        client.release();
    }
  },

  /* --------------------------------------------------
     List
  -------------------------------------------------- */
  async listProjects(params: {
    workspaceId: string;
    userId: number;
  }): Promise<ProjectListItem[]> {
    const { workspaceId, userId } = params;
    if (!workspaceId || !userId) return [];

    const { rows } = await pgPool.query<{
      id: string;
      name: string;
      role: ProjectRole;
      created_at: string;
    }>(
      `
      SELECT p.id, p.name, pm.role, p.created_at
      FROM projects p
      JOIN project_members pm ON pm.project_id = p.id
      WHERE p.workspace_id = $1
        AND pm.user_id = $2
      ORDER BY p.created_at DESC
      `,
      [workspaceId, userId]
    );

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      role: r.role,
      createdAt: new Date(r.created_at).getTime(),
    }));
  },

  /* --------------------------------------------------
     Get One
  -------------------------------------------------- */
  async getProject(params: {
    workspaceId: string;
    projectId: string;
    userId: number;
  }): Promise<ProjectListItem | null> {
    const { workspaceId, projectId, userId } = params;
    if (!workspaceId || !projectId || !userId) return null;

    const { rows } = await pgPool.query<{
      id: string;
      name: string;
      role: ProjectRole;
      created_at: string;
    }>(
      `
      SELECT p.id, p.name, pm.role, p.created_at
      FROM projects p
      JOIN project_members pm ON pm.project_id = p.id
      WHERE p.workspace_id = $1
        AND p.id = $2
        AND pm.user_id = $3
      LIMIT 1
      `,
      [workspaceId, projectId, userId]
    );

    const r = rows[0];
    if (!r) return null;

    return {
      id: r.id,
      name: r.name,
      role: r.role,
      createdAt: new Date(r.created_at).getTime(),
    };
  },
};
