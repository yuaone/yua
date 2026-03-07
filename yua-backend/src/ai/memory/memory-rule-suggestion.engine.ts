import { pgPool } from "../../db/postgres";
import { logGovernanceEvent } from "../governance/memory-governance-audit.repo";
import type { RuleSuggestion } from "./memory-rule-suggestion";

export async function persistRuleSuggestions(params: {
  workspaceId: string;
  suggestions: RuleSuggestion[];
  source: "snapshot_learning" | "drift" | "decay";
}): Promise<number> {
  const { workspaceId, suggestions, source } = params;

  let count = 0;

  for (const s of suggestions) {
    if (s.suggestion === "no_change") continue;

    const { rows } = await pgPool.query<{ id: number }>(
      `
      INSERT INTO memory_rule_suggestions (
        workspace_id,
        source,
        target,
        diff,
        confidence
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
      `,
      [
        workspaceId,
        source,
        "memory_rule",
        {
          scope: s.scope,
          action: s.suggestion,
          reason: s.reason,
        },
        s.confidence,
      ]
    );

    await logGovernanceEvent({
      workspaceId,
      category: "SUGGESTION",
      refId: rows[0].id,
      message: `Rule suggestion generated: ${s.suggestion}`,
      meta: { scope: s.scope },
    });

    count++;
  }

  return count;
}
