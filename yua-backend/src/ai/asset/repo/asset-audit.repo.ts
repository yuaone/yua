import { pgPool } from "../../../db/postgres";
import type { AssetAction, AssetAuditRow } from "../types/asset.types";

export const AssetAuditRepo = {
  async log(params: {
    assetId: string;
    version: number | null;
    action: AssetAction;
    actorUserId: number;
    workspaceId: string;
    meta?: any;
  }): Promise<AssetAuditRow> {
    const { assetId, version, action, actorUserId, workspaceId, meta = {} } = params;

    const { rows } = await pgPool.query<AssetAuditRow>(
      `
      INSERT INTO asset_audit_logs (
        asset_id, version, action, actor_user_id, workspace_id, meta
      )
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING *
      `,
      [assetId, version, action, actorUserId, workspaceId, meta]
    );

    return rows[0];
  },
};
