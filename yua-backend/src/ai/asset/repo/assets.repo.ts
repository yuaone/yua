import { pgPool } from "../../../db/postgres";
import type { AssetRow, AssetStatus, AssetType } from "../types/asset.types";

export const AssetsRepo = {
  async insert(params: {
    id: string;
    workspaceId: string;
    projectId: string | null;
    assetType: AssetType;
    title?: string | null;
    description?: string | null;
    createdBy: number;
    status?: AssetStatus;
  }): Promise<AssetRow> {
    const {
      id,
      workspaceId,
      projectId,
      assetType,
      title = null,
      description = null,
      createdBy,
      status = "DRAFT",
    } = params;

    const { rows } = await pgPool.query<AssetRow>(
      `
      INSERT INTO assets (
        id, workspace_id, project_id, asset_type,
        title, description, status, created_by
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *
      `,
      [id, workspaceId, projectId, assetType, title, description, status, createdBy]
    );

    return rows[0];
  },

  async getById(assetId: string): Promise<AssetRow | null> {
    const { rows } = await pgPool.query<AssetRow>(
      `SELECT * FROM assets WHERE id = $1 LIMIT 1`,
      [assetId]
    );
    return rows[0] ?? null;
  },
};
