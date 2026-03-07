import { pgPool } from "../../db/postgres";
import { isUuid } from "../../utils/is-uuid";

export type WorkspaceRole = "owner" | "admin" | "member" | "viewer";

export async function hasWorkspacePermission(
  workspaceId: string,
  userId: number,
  permissionKey: string
): Promise<boolean> {
  if (!isUuid(workspaceId)) return false;
  if (!Number.isFinite(userId) || userId <= 0) return false;
  if (!permissionKey) return false;

  const userOverride = await pgPool.query<{ granted: boolean }>(
    `
    SELECT granted
    FROM workspace_user_permissions
    WHERE workspace_id = $1 AND user_id = $2 AND permission_key = $3
    LIMIT 1
    `,
    [workspaceId, userId, permissionKey]
  );

  if (userOverride.rows.length > 0) {
    return Boolean(userOverride.rows[0]?.granted);
  }

  const roleRes = await pgPool.query<{ role: string }>(
    `
    SELECT role
    FROM workspace_users
    WHERE workspace_id = $1 AND user_id = $2
    LIMIT 1
    `,
    [workspaceId, userId]
  );

  const roleKey = roleRes.rows[0]?.role;
  if (!roleKey) return false;

  const rolePerm = await pgPool.query(
    `
    SELECT 1
    FROM workspace_role_permissions rp
    JOIN workspace_roles r
      ON r.id = rp.role_id
    WHERE r.workspace_id = $1
      AND r.key = $2
      AND rp.permission_key = $3
    LIMIT 1
    `,
    [workspaceId, roleKey, permissionKey]
  );

  return rolePerm.rows.length > 0;
}

export const WorkspaceAccess = {
  async getRole(workspaceId: string, userId: number): Promise<WorkspaceRole | null> {
    // ✅ SSOT: 절대 PG에 "uuid 아닌 값"을 넣지 말 것
    if (!isUuid(workspaceId)) return null;
    if (!Number.isFinite(userId) || userId <= 0) return null;

    const r = await pgPool.query<{ role: WorkspaceRole }>(
      `
      SELECT role
      FROM workspace_users
      WHERE workspace_id = $1 AND user_id = $2
      LIMIT 1
      `,
      [workspaceId, userId]
    );

    return r.rows[0]?.role ?? null;
  },

  async assertMember(workspaceId: string, userId: number): Promise<WorkspaceRole> {
    const role = await this.getRole(workspaceId, userId);
    if (!role) throw new Error("workspace_membership_required");
    return role;
  },

  // ✅ role이 null일 수 있는 호출 경로(예: getRole 결과)를 허용
  // null/undefined면 admin 아님
  isAdmin(role: WorkspaceRole | null | undefined) {
    return role === "owner" || role === "admin";
  },
};
