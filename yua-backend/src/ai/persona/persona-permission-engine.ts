// 📂 src/ai/persona/persona-permission-engine.ts

import {
  getWorkspaceUserPersonaFlags,
} from "../../db/repo/workspace-user-persona-flags.repo";
import {
  getWorkspaceUserToneSignal,
} from "../../db/repo/workspace-user-tone-signal.repo";
import type { NormalizedVerdict } from "../judgment/verdict-adapter";
import { resolveWorkspacePersonaPolicy } from "./workspace-persona-policy";
import type {
  Persona,
  PersonaPermissionSource,
} from "./persona-context.types";

export interface PersonaPermissionInput {
  userId: number;
  workspaceId: string;
  verdict: NormalizedVerdict;
  persona: Persona;
}

export interface PersonaPermissionResult {
  allowNameCall: boolean;
  allowPersonalTone: boolean;
  source: PersonaPermissionSource;
  displayName?: string | null;
}

export class PersonaPermissionEngine {
  static async resolve(
    input: PersonaPermissionInput
  ): Promise<PersonaPermissionResult> {
    const { userId, workspaceId, verdict, persona } = input;

    /* 0) Judgment gate */
    if (verdict !== "APPROVE") {
      return {
        allowNameCall: false,
        allowPersonalTone: false,
        source: "judgment_blocked",
        displayName: null,
      };
    }

    /* 1) Tone signal (workspace scoped) */
    const toneSignal = await getWorkspaceUserToneSignal(workspaceId, userId);

    if (!toneSignal || toneSignal.toneCapability !== "named") {
      return {
        allowNameCall: false,
        allowPersonalTone: false,
        source: "anonymous_user",
        displayName: null,
      };
    }

    const displayName =
      typeof toneSignal.name === "string"
        ? toneSignal.name.trim() || null
        : null;

    /* 2) Workspace scoped explicit flags */
    const personaFlags = await getWorkspaceUserPersonaFlags(workspaceId, userId);

    /* 3) Workspace persona policy */
    const workspacePolicy = await resolveWorkspacePersonaPolicy(workspaceId, persona);

    /* 4) Merge — SSOT priority */
    const allowNameCall =
      personaFlags?.allowNameCall ??
      workspacePolicy.allowNameCall ??
      false;

    const allowPersonalTone =
      personaFlags?.allowPersonalTone ??
      workspacePolicy.allowPersonalTone ??
      false;

    const source: PersonaPermissionSource =
      personaFlags
        ? "explicit_user_flag"
        : workspacePolicy.source === "workspace_policy"
        ? "workspace_persona_policy"
        : "default_named_policy";

    return {
      allowNameCall,
      allowPersonalTone,
      source,
      displayName,
    };
  }
}
