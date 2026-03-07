export type AssetType = "DOCUMENT" | "IMAGE" | "VIDEO";

export type AssetStatus =
  | "DRAFT"
  | "APPROVED"
  | "DEPRECATED"
  | "PUBLISHED";

export type CanonicalType =
  | "MARKDOWN_AST"
  | "IMAGE_SPEC"
  | "VIDEO_SCRIPT";

export type AssetAction =
  | "CREATE"
  | "REGENERATE"
  | "APPROVE"
  | "EXPORT"
  | "DELETE";

export interface AssetRow {
  id: string;
  workspace_id: string;
  project_id: string | null;
  asset_type: AssetType;
  title: string | null;
  description: string | null;
  status: AssetStatus;
  created_by: number;
  created_at: string;
  updated_at: string;
}

export interface AssetVersionRow {
  id: number;
  asset_id: string;
  version: number;
  canonical_type: CanonicalType;
  schema_version: string;
  content_ref: string;
  prompt_snapshot: string | null;
  style_id: string | null;
  created_by: number;
  created_at: string;
}

export interface AssetAuditRow {
  id: number;
  asset_id: string;
  version: number | null;
  action: AssetAction;
  actor_user_id: number;
  workspace_id: string;
  meta: any;
  created_at: string;
}
