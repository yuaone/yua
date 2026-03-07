// Workspace shared types (SSOT for all workspace components)

export type Tier = "free" | "pro" | "business" | "enterprise";
export type WsRole = "owner" | "admin" | "member" | "viewer";

export type Member = {
  userId: number;
  role: WsRole;
  email: string | null;
  name: string | null;
};

export type Invite = {
  id: string;
  email: string;
  role: "admin" | "member" | "viewer";
  status:
    | "pending"
    | "pending_approval"
    | "approved"
    | "accepted"
    | "revoked"
    | "expired";
  createdAt: number;
  invitedByUserId?: number | null;
};

export type Caps = {
  canInvite: boolean;
  canChangeRole: boolean;
  canRemoveMember: boolean;
  canApprove?: boolean;
};

export type InviteLinkData = {
  token: string;
  maxUses: number | null;
  uses: number;
  expiresAt: number | null;
  role: "admin" | "member" | "viewer";
};

export type DomainItem = {
  id: string;
  domain: string;
  autoJoin: boolean;
  requiresApproval: boolean;
  createdAt: number;
};

export type SsoProvider = {
  id: string;
  provider: string;
  domain: string;
  enabled: boolean;
  createdAt: number;
};

export type Permission = {
  key: string;
  description: string;
};

export type CustomRole = {
  id: string;
  key: string;
  name: string;
  isSystem: boolean;
};

export type RolePermission = {
  roleId: string;
  permissionKey: string;
};

export type AuditItem = {
  id: string;
  score: number;
  meta: {
    route?: string;
    method?: string;
    userId?: number;
    updatedAt?: number;
    text?: string;
  };
};

export type SectionId =
  | "general"
  | "team"
  | "invites"
  | "domains"
  | "approval"
  | "sso"
  | "permissions"
  | "audit"
  | "danger";

export type AuthFetchFn = (
  url: string,
  init?: RequestInit
) => Promise<Response>;

export type ToastFn = (
  msg: string,
  kind?: "ok" | "warn" | "error"
) => void;
