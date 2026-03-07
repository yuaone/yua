// 📂 src/ai/persona/workspace-persona-policy.ts
// 🏢 Workspace Persona Policy — READ ONLY (SSOT)
//
// 역할:
// - workspace + persona 기준 표현 허용 정책 조회
// - PersonaPermissionEngine 에서만 사용
// - fallback 안전 설계

import { pgPool } from "../../db/postgres";
import type { Persona } from "./persona-context.types";
import { isUuid } from "../../utils/is-uuid";

/* ==================================================
 * Types
 * ================================================== */

export type WorkspacePersonaPolicy = {
  allowPersonalTone: boolean;
  allowNameCall: boolean;
  source: "workspace_policy" | "default";
};

/* ==================================================
 * Resolver
 * ================================================== */

export async function resolveWorkspacePersonaPolicy(
  workspaceId: string,
  persona: Persona
): Promise<WorkspacePersonaPolicy> {
    if (!isUuid(workspaceId)) {
    return {
      allowPersonalTone: false,
      allowNameCall: false,
      source: "default",
    };
  }
  try {
    const r = await pgPool.query<{
      allow_personal_tone: boolean;
      allow_name_call: boolean;
    }>(
      `
      SELECT
        allow_personal_tone,
        allow_name_call
      FROM workspace_persona_policy
      WHERE workspace_id = $1
        AND persona = $2
      LIMIT 1
      `,
      [workspaceId, persona]
    );

    if (r.rows.length > 0) {
      return {
        allowPersonalTone: r.rows[0].allow_personal_tone,
        allowNameCall: r.rows[0].allow_name_call,
        source: "workspace_policy",
      };
    }
  } catch (e) {
    console.warn(
      "[WORKSPACE_PERSONA_POLICY][READ_FAIL]",
      e
    );
  }

  // 🔒 안전 기본값
  return {
    allowPersonalTone: false,
    allowNameCall: false,
    source: "default",
  };
}
