/**
 * Mobile sidebar types extend yua-shared ChatThread/Workspace with
 * mobile-specific fields (pinning, caps, projectId).
 * Base types: ChatThread, Workspace from yua-shared (SSOT).
 */

export type MobileProject = {
  id: string;
  name: string;
  role?: "owner" | "editor" | "viewer" | string;
};

export type MobileThreadCaps = {
  canRead?: boolean;
  canWrite?: boolean;
  canRename?: boolean;
  canDelete?: boolean;
  canPin?: boolean;
  canMove?: boolean;
};

export type MobileThread = {
  id: number;
  title: string;
  projectId: string | null;
  createdAt: number;
  lastActiveAt?: number;
  pinned?: boolean;
  pinnedOrder?: number | null;
  caps?: MobileThreadCaps | null;
};

export type SidebarPanelMode = "projects" | "threads" | "photos";
