export type AdminRole = "superadmin" | "admin" | "support_agent" | "billing_manager" | "viewer";

export type AdminMemberStatus = "active" | "suspended" | "invited";

export interface AdminUser {
  id: number;
  firebase_uid: string;
  email: string;
  name: string | null;
  role: AdminRole;
  is_active: boolean;
  totp_enabled: boolean;
  created_at: string;
  last_login_at: string | null;
}

/** IAM 멤버 (직원 관리용, admin_users 테이블 기반) */
export interface AdminMember {
  id: string;
  email: string;
  name: string;
  role: AdminRole;
  status: AdminMemberStatus;
  invited_by: string | null;
  invited_by_name?: string | null;
  created_at: string;
  updated_at: string;
}

/** 권한 매트릭스 엔트리 */
export type PermissionLevel = "RW" | "R" | "-";

export interface PermissionMatrixRow {
  resource: string;
  superadmin: PermissionLevel;
  admin: PermissionLevel;
  support_agent: PermissionLevel;
  billing_manager: PermissionLevel;
  viewer: PermissionLevel;
}

export interface AdminSession {
  id: number;
  admin_id: number;
  token_hash: string;
  ip_address: string;
  user_agent: string;
  expires_at: string;
  created_at: string;
}

export interface AdminAuditLog {
  id: number;
  admin_id: number;
  action: string;
  target_type: string;
  target_id: string;
  before_value?: string | null;
  after_value?: string | null;
  ip_address: string;
  created_at: string;
  /** JOIN으로 채워지는 필드 (admin_users 테이블) */
  admin_email?: string;
  admin_name?: string;
  details?: Record<string, any>;
}
