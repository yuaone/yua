import { Workspace } from "../workspace/workspace-types";
import { WorkspaceRole, ID } from "../types/common";

/* =========================
   Auth User
========================= */

export type AuthUser = {
  id: ID;
  email: string | null;
  name: string | null;
};

/* =========================
   Auth Profile
========================= */

export type AuthProfile = {
  user: AuthUser;
  workspace: Workspace;
  role: WorkspaceRole;
};
