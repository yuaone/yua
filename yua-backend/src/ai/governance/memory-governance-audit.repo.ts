import { pgPool } from "../../db/postgres";

export async function logGovernanceEvent(params: {
  workspaceId: string;
  category:
    | "SUGGESTION"
    | "APPROVAL"
    | "DRY_RUN"
    | "APPLY"
    | "ROLLBACK"
    | "FREEZE"
    | "UNFREEZE";
  refId?: number;
  message?: string;
  meta?: Record<string, any>;
}): Promise<void> {
  const { workspaceId, category, refId, message, meta } = params;

  await pgPool.query(
    `
    INSERT INTO memory_governance_audit_logs
      (workspace_id, category, ref_id, message, meta)
    VALUES ($1, $2, $3, $4, $5)
    `,
    [workspaceId, category, refId ?? null, message ?? null, meta ?? null]
  );
}
