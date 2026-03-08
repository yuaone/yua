import type { APIClient } from "../core/api-client";

export interface AdminUser {
  id: number;
  firebase_uid: string;
  email: string | null;
  name: string | null;
  role: string;
  auth_provider: string | null;
  plan_id: string | null;
  created_at: string;
  last_login_at: string | null;
}

export interface AdminUserListResponse {
  users: AdminUser[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminStats {
  users: { total: number };
  threads: { total: number };
  workspaces: { total: number };
}

export interface AdminTicket {
  id: number;
  workspace_id: string;
  user_id: number;
  subject: string;
  category: string;
  priority: string;
  status: string;
  assigned_admin_id: number | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export interface AdminTicketListResponse {
  tickets: AdminTicket[];
  total: number;
  page: number;
  limit: number;
}

export interface ListParams {
  page?: number;
  limit?: number;
  search?: string;
}

export interface TicketListParams {
  page?: number;
  limit?: number;
  status?: string;
  priority?: string;
}

export class Admin {
  private readonly client: APIClient;

  constructor(client: APIClient) {
    this.client = client;
  }

  async listUsers(params?: ListParams): Promise<AdminUserListResponse> {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.search) query.set("search", params.search);

    const qs = query.toString();
    const path = `/api/admin/users${qs ? `?${qs}` : ""}`;

    const res = await this.client.get<{ ok: boolean; data: AdminUserListResponse }>(path);
    return res.data;
  }

  async getUser(id: number): Promise<AdminUser> {
    const res = await this.client.get<{ ok: boolean; data: { user: AdminUser } }>(
      `/api/admin/users/${id}`
    );
    return res.data.user;
  }

  async updateUser(
    id: number,
    data: { role?: string; plan_id?: string; is_banned?: boolean }
  ): Promise<{ userId: number; updated: Record<string, unknown> }> {
    const res = await this.client.patch<{
      ok: boolean;
      data: { userId: number; updated: Record<string, unknown> };
    }>(`/api/admin/users/${id}`, data);
    return res.data;
  }

  async getStats(): Promise<AdminStats> {
    const res = await this.client.get<{ ok: boolean; data: AdminStats }>(
      "/api/admin/stats"
    );
    return res.data;
  }

  async listTickets(params?: TicketListParams): Promise<AdminTicketListResponse> {
    const query = new URLSearchParams();
    if (params?.page) query.set("page", String(params.page));
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.status) query.set("status", params.status);
    if (params?.priority) query.set("priority", params.priority);

    const qs = query.toString();
    const path = `/api/admin/tickets${qs ? `?${qs}` : ""}`;

    const res = await this.client.get<{ ok: boolean; data: AdminTicketListResponse }>(path);
    return res.data;
  }
}
