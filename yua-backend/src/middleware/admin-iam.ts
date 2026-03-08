export { validateAdminSession } from "./admin-session";
export { requireRole } from "./admin-rbac";
export type { AdminRole } from "./admin-rbac";
export type { AdminContext } from "./admin-session";

import { pgPool } from "../db/postgres";
import { logError } from "../utils/logger";

/**
 * Logs admin action to admin_audit_logs table.
 */
export async function logAdminAction(
  adminId: number,
  action: string,
  targetType: string,
  targetId: string,
  before?: string | null,
  after?: string | null,
  ip?: string
): Promise<void> {
  try {
    await pgPool.query(
      `INSERT INTO admin_audit_logs
        (admin_id, action, target_type, target_id, before_value, after_value, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [adminId, action, targetType, targetId, before ?? null, after ?? null, ip ?? "unknown"]
    );
  } catch (err) {
    logError("[audit-log] Failed to log admin action:", (err as Error).message);
  }
}
