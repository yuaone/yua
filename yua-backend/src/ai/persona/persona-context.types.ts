// 📂 src/ai/persona/persona-context.types.ts
// 🔒 Persona Context — SSOT CONTRACT (PRODUCTION READY)

/* ==================================================
 * Persona (Behavior)
 * ================================================== */

export type Persona =
  | "developer"
  | "designer"
  | "planner"
  | "executor"
  | "explorer"
  | "unknown";

export type PersonaBehaviorHint = {
  persona: Persona;
  confidence: number;
  source?: "anchors" | "history" | "policy" | "unknown";
  meta?: Record<string, unknown>;
};

/* ==================================================
 * Permission (SSOT)
 * ================================================== */

export type PersonaPermissionSource =
  | "explicit_user_flag"
  | "workspace_persona_policy"
  | "default_named_policy"
  | "anonymous_user"
  | "judgment_blocked";

export type PersonaPermission = {
  allowNameCall: boolean;
  allowPersonalTone: boolean;
  source: PersonaPermissionSource;
  displayName?: string | null;
  flags?: Partial<{
    allowEmoji: boolean;
    allowHumor: boolean;
    allowDirectiveness: boolean;
  }>;
};

/* ==================================================
 * PersonaContext
 * ================================================== */

export type PersonaContext = {
  permission: PersonaPermission;
  behavior?: PersonaBehaviorHint;
  version?: "v1";
};

/* ==================================================
 * Safe Defaults
 * ================================================== */

export function defaultPersonaPermission(
  source: PersonaPermissionSource = "anonymous_user"
): PersonaPermission {
  return {
    allowNameCall: false,
    allowPersonalTone: false,
    source,
  };
}

export function defaultPersonaContext(
  source: PersonaPermissionSource = "anonymous_user"
): PersonaContext {
  return {
    permission: defaultPersonaPermission(source),
    version: "v1",
  };
}
