// User Profile Auto-Population
// Syncs user info from MySQL users table to PostgreSQL memory_records on first interaction

import { pool as mysqlPool } from "../../db/mysql";
import { pgPool } from "../../db/postgres";

export async function ensureUserProfile(params: {
  userId: number;
  workspaceId: string;
}): Promise<void> {
  // Check if user_profile already exists
  const existing = await pgPool.query(
    `SELECT id FROM memory_records
     WHERE workspace_id = $1 AND created_by_user_id = $2 AND scope = 'user_profile' AND is_active = true
     LIMIT 1`,
    [params.workspaceId, String(params.userId)]
  );

  if (existing.rows.length > 0) return; // Already populated

  // Fetch user info from MySQL
  const [rows] = (await mysqlPool.query(
    "SELECT name, email, auth_provider FROM users WHERE id = ?",
    [params.userId]
  )) as any;

  const user = rows?.[0];
  if (!user?.name) return;

  // Write to memory_records
  const content = `사용자 이름: ${user.name}`;

  await pgPool.query(
    `INSERT INTO memory_records (workspace_id, created_by_user_id, scope, content, confidence, source, record_type)
     VALUES ($1, $2, 'user_profile', $3, 0.95, 'system_sync', 'memory')`,
    [params.workspaceId, String(params.userId), content]
  );
}
