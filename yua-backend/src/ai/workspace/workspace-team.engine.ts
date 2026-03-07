    import { randomBytes } from "crypto";
    import { pgPool } from "../../db/postgres";
    import { db } from "../../db/mysql";
    import type { RowDataPacket } from "mysql2/promise";

    export type WorkspaceMemberRole = "owner" | "admin" | "member" | "viewer";
    export type InviteRole = "admin" | "member" | "viewer";
    export type InviteStatus = "pending" | "pending_approval" | "approved" | "accepted" | "revoked" | "expired";
    export type JoinMethod = "email_invite" | "invite_link" | "domain_auto" | "sso";

    function normEmail(email: string) {
    return String(email || "").trim().toLowerCase();
    }

    function getEmailDomain(email: string): string {
    const e = normEmail(email);
    const at = e.lastIndexOf("@");
    if (at <= 0) return "";
    return e.slice(at + 1);
    }

    async function getWorkspaceRequiresApproval(workspaceId: string): Promise<boolean> {
    try {
        const r = await pgPool.query<{ requires_approval: boolean }>(
        `
        SELECT requires_approval
        FROM workspaces
        WHERE id = $1
        LIMIT 1
        `,
        [workspaceId]
        );
        return Boolean(r.rows[0]?.requires_approval);
    } catch {
        return false;
    }
    }

    async function logJoinEvent(params: {
    workspaceId: string;
    userId: number;
    method: JoinMethod;
    source?: string | null;
    }) {
    try {
        await pgPool.query(
        `
        INSERT INTO workspace_join_events (workspace_id, user_id, method, source)
        VALUES ($1, $2, $3, $4)
        `,
        [params.workspaceId, params.userId, params.method, params.source ?? null]
        );
    } catch (e) {
        console.error("[WorkspaceTeamEngine.logJoinEvent]", e);
    }
    }
    async function findUserIdByEmail(email: string): Promise<number | null> {
    const e = normEmail(email);
    if (!e) return null;
    const [rows] = await db.query<RowDataPacket[]>(
        `SELECT id FROM users WHERE LOWER(email) = ? LIMIT 1`,
        [e]
    );
    const id = rows?.[0]?.id;
    return id ? Number(id) : null;
    }

    export const WorkspaceTeamEngine = {
    async acceptPendingInvitesForEmail(params: { userId: number; email: string | null }) {
        const { userId } = params;
        const email = params.email ? normEmail(params.email) : "";
        if (!userId || !email) return;

        const client = await pgPool.connect();
        try {
        await client.query("BEGIN");
        const r = await client.query<{
            id: string;
            workspace_id: string;
            role: InviteRole;
        }>(
            `
            SELECT id, workspace_id, role
            FROM workspace_invitations
            WHERE LOWER(email) = $1
            AND status IN ('pending', 'approved')
            AND (expires_at IS NULL OR expires_at > NOW())
            `,
            [email]
        );

        for (const inv of r.rows) {
            // ✅ workspace_users upsert
            await client.query(
            `
            INSERT INTO workspace_users (workspace_id, user_id, role)
            VALUES ($1, $2, $3)
            ON CONFLICT (workspace_id, user_id)
            DO UPDATE SET role = EXCLUDED.role
            `,
            [inv.workspace_id, userId, inv.role]
            );

            // ✅ invitation accept
            await client.query(
            `
            UPDATE workspace_invitations
            SET status = 'accepted', accepted_at = NOW()
            WHERE id = $1
            `,
            [inv.id]
            );

            await logJoinEvent({
            workspaceId: inv.workspace_id,
            userId,
            method: "email_invite",
            source: "invite_email",
            });
        }

        await client.query("COMMIT");
        } catch (e) {
        try { await client.query("ROLLBACK"); } catch {}
        // 조용히 실패해도 /me 전체를 죽이면 안 됨
        console.error("[WorkspaceTeamEngine.acceptPendingInvitesForEmail]", e);
        } finally {
        client.release();
        }
    },

    async listWorkspacesForUser(userId: number) {
        const r = await pgPool.query<{
        workspace_id: string;
        role: WorkspaceMemberRole;
        type: string;
        }>(
        `
        SELECT
            wu.workspace_id,
            wu.role,
            NULL::text as name,
            w.type
        FROM workspace_users wu
        JOIN workspaces w ON w.id = wu.workspace_id
        WHERE wu.user_id = $1
        ORDER BY w.created_at DESC NULLS LAST
        `,
        [userId]
        );

        return r.rows.map((x) => ({
        id: x.workspace_id,
        role: x.role,
        // workspaces.name 없음(SSOT) → type 기반 fallback
        name:
            x.type === "personal"
            ? "Personal Workspace"
            : "Workspace",
        type: x.type,
        }));
    },

    async listMembersAndInvites(workspaceId: string) {
        const members = await pgPool.query<{
        user_id: number;
        role: WorkspaceMemberRole;
        }>(
        `
        SELECT user_id, role
        FROM workspace_users
        WHERE workspace_id = $1
        ORDER BY
            CASE role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 WHEN 'member' THEN 2 ELSE 3 END,
            user_id ASC
        `,
        [workspaceId]
        );

        // MySQL users 정보 붙이기
        const ids = members.rows.map((m) => m.user_id);
        let userMap = new Map<number, { email: string | null; name: string | null }>();
        if (ids.length > 0) {
        const [uRows] = await db.query<RowDataPacket[]>(
            `SELECT id, email, name FROM users WHERE id IN (${ids.map(() => "?").join(",")})`,
            ids as any
        );
        for (const u of uRows) {
            userMap.set(Number(u.id), {
            email: (u.email as string) ?? null,
            name: (u.name as string) ?? null,
            });
        }
        }

        const inv = await pgPool.query<{
        id: string;
        email: string;
        role: InviteRole;
        status: InviteStatus;
        created_at: string;
        invited_by_user_id: number | null;
        expires_at: string | null;
        }>(
        `
        SELECT id, email, role, status, created_at, invited_by_user_id, expires_at
        FROM workspace_invitations
        WHERE workspace_id = $1
        ORDER BY created_at DESC
        LIMIT 200
        `,
        [workspaceId]
        );

        const normalizedInvites = inv.rows.map((i) => {
        const expired =
            (i.status === "pending" || i.status === "pending_approval") &&
            i.expires_at &&
            new Date(i.expires_at).getTime() < Date.now();
        return {
            id: i.id,
            email: i.email,
            role: i.role,
            status: expired ? "expired" : i.status,
            createdAt: new Date(i.created_at).getTime(),
            invitedByUserId: i.invited_by_user_id ?? null,
        };
        });

        const pending = normalizedInvites.filter((i) => i.status === "pending");
        const approval = normalizedInvites.filter((i) => i.status === "pending_approval");

        return {
        members: members.rows.map((m) => ({
            userId: m.user_id,
            role: m.role,
            email: userMap.get(m.user_id)?.email ?? null,
            name: userMap.get(m.user_id)?.name ?? null,
        })),
        invites: normalizedInvites,
        approvalQueue: approval,
        };
    },

    async leaveWorkspace(params: { workspaceId: string; userId: number }) {
        const r = await pgPool.query(
        `
        DELETE FROM workspace_users
        WHERE workspace_id = $1 AND user_id = $2
        RETURNING user_id
        `,
        [params.workspaceId, params.userId]
        );
        return r.rows.length > 0;
    },

    async transferOwnership(params: {
        workspaceId: string;
        currentOwnerId: number;
        targetUserId: number;
    }) {
        const client = await pgPool.connect();
        try {
        await client.query("BEGIN");

        const target = await client.query(
            `
            SELECT user_id, role
            FROM workspace_users
            WHERE workspace_id = $1 AND user_id = $2
            LIMIT 1
            `,
            [params.workspaceId, params.targetUserId]
        );
        if (!target.rows.length) {
            await client.query("ROLLBACK");
            return { ok: false as const, error: "target_not_member" };
        }

        const owner = await client.query(
            `
            SELECT user_id, role
            FROM workspace_users
            WHERE workspace_id = $1 AND user_id = $2 AND role = 'owner'
            LIMIT 1
            `,
            [params.workspaceId, params.currentOwnerId]
        );
        if (!owner.rows.length) {
            await client.query("ROLLBACK");
            return { ok: false as const, error: "owner_required" };
        }

        // 기존 owner -> admin
        await client.query(
            `
            UPDATE workspace_users
            SET role = 'admin'
            WHERE workspace_id = $1 AND role = 'owner' AND user_id <> $2
            `,
            [params.workspaceId, params.targetUserId]
        );

        // 대상 owner 승격
        await client.query(
            `
            UPDATE workspace_users
            SET role = 'owner'
            WHERE workspace_id = $1 AND user_id = $2
            `,
            [params.workspaceId, params.targetUserId]
        );

        await client.query(
            `
            UPDATE workspaces
            SET owner_user_id = $1
            WHERE id = $2
            `,
            [params.targetUserId, params.workspaceId]
        );

        await client.query("COMMIT");
        return { ok: true as const };
        } catch (e) {
        try { await client.query("ROLLBACK"); } catch {}
        return { ok: false as const, error: "transfer_failed" };
        } finally {
        client.release();
        }
    },

    async inviteByEmail(params: {
        workspaceId: string;
        invitedByUserId: number;
        email: string;
        role: InviteRole;
    }) {
        const workspaceId = params.workspaceId;
        const email = normEmail(params.email);
        const role = params.role;
    if (!workspaceId || !params.invitedByUserId || !email) return { ok: false as const, error: "invalid_params" };

        const requiresApproval = await getWorkspaceRequiresApproval(workspaceId);
        const existingUserId = await findUserIdByEmail(email);

        const client = await pgPool.connect();
        try {
        await client.query("BEGIN");

        // ✅ 초대 레코드 upsert(pending)
        await client.query(
            `
            INSERT INTO workspace_invitations (workspace_id, email, role, status, invited_by_user_id)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (workspace_id, email) WHERE status IN ('pending', 'pending_approval')
            DO UPDATE SET role = EXCLUDED.role, status = EXCLUDED.status
            `,
            [workspaceId, email, role, requiresApproval ? "pending_approval" : "pending", params.invitedByUserId]
        );

        // ✅ 이미 가입자면 즉시 workspace_users 반영 + invitation accepted 처리
        if (existingUserId && !requiresApproval) {
            await client.query(
            `
            INSERT INTO workspace_users (workspace_id, user_id, role)
            VALUES ($1, $2, $3)
            ON CONFLICT (workspace_id, user_id)
            DO UPDATE SET role = EXCLUDED.role
            `,
            [workspaceId, existingUserId, role]
            );

            await client.query(
            `
            UPDATE workspace_invitations
            SET status = 'accepted', accepted_at = NOW()
            WHERE workspace_id = $1 AND LOWER(email) = $2 AND status = 'pending'
            `,
            [workspaceId, email]
            );

            await logJoinEvent({
            workspaceId,
            userId: existingUserId,
            method: "email_invite",
            source: "invite_email",
            });
        }

        await client.query("COMMIT");
        return {
        ok: true as const,
        immediate: Boolean(existingUserId) && !requiresApproval,
        pendingApproval: requiresApproval,
        };
        } catch (e) {
        try { await client.query("ROLLBACK"); } catch {}
        console.error("[WorkspaceTeamEngine.inviteByEmail]", e);
        return { ok: false as const, error: "invite_failed" };
        } finally {
        client.release();
        }
    },

    async updateMemberRole(params: { workspaceId: string; targetUserId: number; role: WorkspaceMemberRole }) {
        const r = await pgPool.query(
        `
        UPDATE workspace_users
        SET role = $1
        WHERE workspace_id = $2 AND user_id = $3
        RETURNING user_id
        `,
        [params.role, params.workspaceId, params.targetUserId]
        );
        return r.rows.length > 0;
    },

    async removeMember(params: { workspaceId: string; targetUserId: number }) {
        const r = await pgPool.query(
        `
        DELETE FROM workspace_users
        WHERE workspace_id = $1 AND user_id = $2
        RETURNING user_id
        `,
        [params.workspaceId, params.targetUserId]
        );
        return r.rows.length > 0;
    },

    async revokeInvite(params: { workspaceId: string; inviteId: string }) {
        const r = await pgPool.query(
        `
        UPDATE workspace_invitations
        SET status = 'revoked', revoked_at = NOW()
        WHERE id = $1 AND workspace_id = $2 AND status IN ('pending', 'pending_approval')
        RETURNING id
        `,
        [params.inviteId, params.workspaceId]
        );
        return r.rows.length > 0;
    },

    async approveInvite(params: { workspaceId: string; inviteId: string }) {
        const client = await pgPool.connect();
        try {
        await client.query("BEGIN");
        const r = await client.query<{
            id: string;
            email: string;
            role: InviteRole;
        }>(
            `
            SELECT id, email, role
            FROM workspace_invitations
            WHERE id = $1 AND workspace_id = $2 AND status = 'pending_approval'
            LIMIT 1
            `,
            [params.inviteId, params.workspaceId]
        );

        const inv = r.rows[0];
        if (!inv) {
            await client.query("ROLLBACK");
            return { ok: false as const, error: "not_found" };
        }

        const userId = await findUserIdByEmail(inv.email);
        if (userId) {
            await client.query(
            `
            INSERT INTO workspace_users (workspace_id, user_id, role)
            VALUES ($1, $2, $3)
            ON CONFLICT (workspace_id, user_id)
            DO UPDATE SET role = EXCLUDED.role
            `,
            [params.workspaceId, userId, inv.role]
            );

            await client.query(
            `
            UPDATE workspace_invitations
            SET status = 'accepted', approved_at = NOW(), accepted_at = NOW()
            WHERE id = $1
            `,
            [inv.id]
            );

            await logJoinEvent({
            workspaceId: params.workspaceId,
            userId,
            method: "email_invite",
            source: "invite_approval",
            });
        } else {
            await client.query(
            `
            UPDATE workspace_invitations
            SET status = 'approved', approved_at = NOW()
            WHERE id = $1
            `,
            [inv.id]
            );
        }

        await client.query("COMMIT");
        return { ok: true as const };
        } catch (e) {
        try { await client.query("ROLLBACK"); } catch {}
        console.error("[WorkspaceTeamEngine.approveInvite]", e);
        return { ok: false as const, error: "approve_failed" };
        } finally {
        client.release();
        }
    },

    async getInviteLink(workspaceId: string) {
        const r = await pgPool.query<{
        id: string;
        token: string;
        max_uses: number | null;
        uses: number;
        expires_at: string | null;
        revoked_at: string | null;
        role: InviteRole | null;
        created_at: string;
        }>(
        `
        SELECT id, token, max_uses, uses, expires_at, revoked_at, role, created_at
        FROM workspace_invite_links
        WHERE workspace_id = $1 AND revoked_at IS NULL
        ORDER BY created_at DESC
        LIMIT 1
        `,
        [workspaceId]
        );
        return r.rows[0] ?? null;
    },

    async createInviteLink(params: {
        workspaceId: string;
        createdByUserId: number;
        maxUses?: number | null;
        expiresAt?: Date | null;
        role?: InviteRole;
    }) {
        const token = randomBytes(32).toString("hex");
        const r = await pgPool.query<{
        id: string;
        token: string;
        max_uses: number | null;
        uses: number;
        expires_at: string | null;
        role: InviteRole | null;
        created_at: string;
        }>(
        `
        INSERT INTO workspace_invite_links
          (workspace_id, token, created_by_user_id, max_uses, expires_at, role)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, token, max_uses, uses, expires_at, role, created_at
        `,
        [
            params.workspaceId,
            token,
            params.createdByUserId,
            params.maxUses ?? null,
            params.expiresAt ?? null,
            params.role ?? "member",
        ]
        );
        return r.rows[0];
    },

    async rotateInviteLink(params: {
        workspaceId: string;
        createdByUserId: number;
        maxUses?: number | null;
        expiresAt?: Date | null;
        role?: InviteRole;
    }) {
        await pgPool.query(
        `
        UPDATE workspace_invite_links
        SET revoked_at = NOW()
        WHERE workspace_id = $1 AND revoked_at IS NULL
        `,
        [params.workspaceId]
        );
        return this.createInviteLink(params);
    },

    async joinByInviteLink(params: {
        token: string;
        userId: number;
        email: string | null;
    }) {
        const token = String(params.token ?? "").trim();
        if (!token) return { ok: false as const, error: "invalid_token" };
        const r = await pgPool.query<{
        id: string;
        workspace_id: string;
        role: InviteRole | null;
        max_uses: number | null;
        uses: number;
        expires_at: string | null;
        }>(
        `
        SELECT id, workspace_id, role, max_uses, uses, expires_at
        FROM workspace_invite_links
        WHERE token = $1 AND revoked_at IS NULL
          AND status = 'active'
          AND (expires_at IS NULL OR expires_at > NOW())
          AND (max_uses IS NULL OR uses < max_uses)
        LIMIT 1
        `,
        [token]
        );
        const link = r.rows[0];
        if (!link) return { ok: false as const, error: "link_invalid_or_expired" };

        const already = await pgPool.query(
        `
        SELECT 1 FROM workspace_users
        WHERE workspace_id = $1 AND user_id = $2
        LIMIT 1
        `,
        [link.workspace_id, params.userId]
        );
        if (already.rows.length > 0) {
        return { ok: true as const, status: "already_member" };
        }

        const requiresApproval = await getWorkspaceRequiresApproval(link.workspace_id);
        if (requiresApproval) {
        await pgPool.query(
            `
            INSERT INTO workspace_invitations (workspace_id, email, role, status, invited_by_user_id)
            VALUES ($1, $2, $3, 'pending_approval', $4)
            ON CONFLICT (workspace_id, email) WHERE status IN ('pending', 'pending_approval', 'approved')
            DO UPDATE SET status = 'pending_approval', role = EXCLUDED.role
            `,
            [link.workspace_id, normEmail(params.email ?? ""), link.role ?? "member", params.userId]
        );
        return { ok: true as const, status: "pending_approval" };
        }

        await pgPool.query(
        `
        INSERT INTO workspace_users (workspace_id, user_id, role)
        VALUES ($1, $2, $3)
        ON CONFLICT (workspace_id, user_id)
        DO UPDATE SET role = EXCLUDED.role
        `,
        [link.workspace_id, params.userId, link.role ?? "member"]
        );

        await pgPool.query(
        `
        UPDATE workspace_invite_links
        SET uses = uses + 1
        WHERE id = $1
        `,
        [link.id]
        );

        await logJoinEvent({
        workspaceId: link.workspace_id,
        userId: params.userId,
        method: "invite_link",
        source: "invite_link",
        });

        return { ok: true as const, status: "joined" };
    },

    async autoJoinByDomain(params: { userId: number; email: string | null }) {
        const email = params.email ? normEmail(params.email) : "";
        const domain = getEmailDomain(email);
        if (!domain) return { ok: false as const, error: "no_domain" };

        const r = await pgPool.query<{
        workspace_id: string;
        auto_join: boolean;
        requires_approval: boolean | null;
        }>(
        `
        SELECT workspace_id, auto_join, requires_approval
        FROM workspace_domains
        WHERE domain = $1
        LIMIT 1
        `,
        [domain]
        );
        const row = r.rows[0];
        if (!row || !row.auto_join) return { ok: false as const, error: "no_match" };

        const exists = await pgPool.query(
        `
        SELECT 1 FROM workspace_users
        WHERE workspace_id = $1 AND user_id = $2
        LIMIT 1
        `,
        [row.workspace_id, params.userId]
        );
        if (exists.rows.length > 0) return { ok: true as const, status: "already_member" };

        const requiresApproval = Boolean(row.requires_approval);
        if (requiresApproval) {
        await pgPool.query(
            `
            INSERT INTO workspace_invitations (workspace_id, email, role, status)
            VALUES ($1, $2, 'member', 'pending_approval')
            ON CONFLICT (workspace_id, email) WHERE status IN ('pending', 'pending_approval', 'approved')
            DO UPDATE SET status = 'pending_approval'
            `,
            [row.workspace_id, email]
        );
        return { ok: true as const, status: "pending_approval" };
        }

        await pgPool.query(
        `
        INSERT INTO workspace_users (workspace_id, user_id, role)
        VALUES ($1, $2, 'member')
        ON CONFLICT (workspace_id, user_id)
        DO UPDATE SET role = EXCLUDED.role
        `,
        [row.workspace_id, params.userId]
        );

        await logJoinEvent({
        workspaceId: row.workspace_id,
        userId: params.userId,
        method: "domain_auto",
        source: domain,
        });

        return { ok: true as const, status: "joined" };
    },

    async autoJoinBySso(params: { userId: number; email: string | null }) {
        const email = params.email ? normEmail(params.email) : "";
        const domain = getEmailDomain(email);
        if (!domain) return { ok: false as const, error: "no_domain" };

        const r = await pgPool.query<{
        workspace_id: string;
        enabled: boolean;
        }>(
        `
        SELECT workspace_id, enabled
        FROM workspace_sso_providers
        WHERE domain = $1
        LIMIT 1
        `,
        [domain]
        );
        const row = r.rows[0];
        if (!row || !row.enabled) return { ok: false as const, error: "no_match" };

        const exists = await pgPool.query(
        `
        SELECT 1 FROM workspace_users
        WHERE workspace_id = $1 AND user_id = $2
        LIMIT 1
        `,
        [row.workspace_id, params.userId]
        );
        if (exists.rows.length > 0) return { ok: true as const, status: "already_member" };

        await pgPool.query(
        `
        INSERT INTO workspace_users (workspace_id, user_id, role)
        VALUES ($1, $2, 'member')
        ON CONFLICT (workspace_id, user_id)
        DO UPDATE SET role = EXCLUDED.role
        `,
        [row.workspace_id, params.userId]
        );

        await logJoinEvent({
        workspaceId: row.workspace_id,
        userId: params.userId,
        method: "sso",
        source: domain,
        });

        return { ok: true as const, status: "joined" };
    },

    async listDomains(workspaceId: string) {
        const r = await pgPool.query<{
        id: string;
        domain: string;
        auto_join: boolean;
        requires_approval: boolean;
        created_at: string;
        }>(
        `
        SELECT id, domain, auto_join, requires_approval, created_at
        FROM workspace_domains
        WHERE workspace_id = $1
        ORDER BY created_at DESC
        `,
        [workspaceId]
        );
        return r.rows.map((d) => ({
        id: d.id,
        domain: d.domain,
        autoJoin: d.auto_join,
        requiresApproval: d.requires_approval,
        createdAt: new Date(d.created_at).getTime(),
        }));
    },

    async createDomain(params: {
        workspaceId: string;
        domain: string;
        autoJoin: boolean;
        requiresApproval: boolean;
    }) {
        const r = await pgPool.query(
        `
        INSERT INTO workspace_domains (workspace_id, domain, auto_join, requires_approval)
        VALUES ($1, $2, $3, $4)
        RETURNING id
        `,
        [params.workspaceId, params.domain, params.autoJoin, params.requiresApproval]
        );
        return r.rows[0]?.id ?? null;
    },

    async updateDomain(params: {
        workspaceId: string;
        domainId: string;
        autoJoin: boolean;
        requiresApproval: boolean;
    }) {
        const r = await pgPool.query(
        `
        UPDATE workspace_domains
        SET auto_join = $1, requires_approval = $2
        WHERE id = $3 AND workspace_id = $4
        RETURNING id
        `,
        [params.autoJoin, params.requiresApproval, params.domainId, params.workspaceId]
        );
        return r.rows.length > 0;
    },

    async deleteDomain(params: { workspaceId: string; domainId: string }) {
        const r = await pgPool.query(
        `
        DELETE FROM workspace_domains
        WHERE id = $1 AND workspace_id = $2
        RETURNING id
        `,
        [params.domainId, params.workspaceId]
        );
        return r.rows.length > 0;
    },

    async listSsoProviders(workspaceId: string) {
        const r = await pgPool.query<{
        id: string;
        provider: string;
        domain: string;
        enabled: boolean;
        created_at: string;
        }>(
        `
        SELECT id, provider, domain, enabled, created_at
        FROM workspace_sso_providers
        WHERE workspace_id = $1
        ORDER BY created_at DESC
        `,
        [workspaceId]
        );
        return r.rows.map((p) => ({
        id: p.id,
        provider: p.provider,
        domain: p.domain,
        enabled: p.enabled,
        createdAt: new Date(p.created_at).getTime(),
        }));
    },

    async connectSsoProvider(params: {
        workspaceId: string;
        provider: string;
        domain: string;
    }) {
        const r = await pgPool.query(
        `
        INSERT INTO workspace_sso_providers (workspace_id, provider, domain, enabled)
        VALUES ($1, $2, $3, true)
        RETURNING id
        `,
        [params.workspaceId, params.provider, params.domain]
        );
        return r.rows[0]?.id ?? null;
    },

    async updateSsoProvider(params: {
        workspaceId: string;
        providerId: string;
        enabled: boolean;
    }) {
        const r = await pgPool.query(
        `
        UPDATE workspace_sso_providers
        SET enabled = $1
        WHERE id = $2 AND workspace_id = $3
        RETURNING id
        `,
        [params.enabled, params.providerId, params.workspaceId]
        );
        return r.rows.length > 0;
    },

    async deleteSsoProvider(params: { workspaceId: string; providerId: string }) {
        const r = await pgPool.query(
        `
        DELETE FROM workspace_sso_providers
        WHERE id = $1 AND workspace_id = $2
        RETURNING id
        `,
        [params.providerId, params.workspaceId]
        );
        return r.rows.length > 0;
    },

    async listPermissions(workspaceId: string) {
        const perms = await pgPool.query<{ key: string; description: string | null }>(
        `
        SELECT key, description
        FROM workspace_permissions
        ORDER BY key ASC
        `
        );
        const roles = await pgPool.query<{ id: string; key: string; name: string; is_system: boolean }>(
        `
        SELECT id, key, name, is_system
        FROM workspace_roles
        WHERE workspace_id = $1
        ORDER BY created_at ASC
        `,
        [workspaceId]
        );

        const roleIds = roles.rows.map((r) => r.id);
        let rolePermissions: { role_id: string; permission_key: string }[] = [];
        if (roleIds.length > 0) {
        const rp = await pgPool.query<{ role_id: string; permission_key: string }>(
            `
            SELECT role_id, permission_key
            FROM workspace_role_permissions
            WHERE role_id = ANY($1::uuid[])
            `,
            [roleIds]
        );
        rolePermissions = rp.rows;
        }

        return {
        permissions: perms.rows.map((p) => ({
            key: p.key,
            description: p.description ?? "",
        })),
        roles: roles.rows.map((r) => ({
            id: r.id,
            key: r.key,
            name: r.name,
            isSystem: r.is_system,
        })),
        rolePermissions: rolePermissions.map((rp) => ({
            roleId: rp.role_id,
            permissionKey: rp.permission_key,
        })),
        };
    },

    async createRole(params: {
        workspaceId: string;
        key: string;
        name: string;
    }) {
        const r = await pgPool.query(
        `
        INSERT INTO workspace_roles (workspace_id, key, name, is_system)
        VALUES ($1, $2, $3, false)
        RETURNING id
        `,
        [params.workspaceId, params.key, params.name]
        );
        return r.rows[0]?.id ?? null;
    },

    async updateRolePermissions(params: {
        roleId: string;
        permissionKeys: string[];
    }) {
        const client = await pgPool.connect();
        try {
        await client.query("BEGIN");
        await client.query(
            `
            DELETE FROM workspace_role_permissions
            WHERE role_id = $1
            `,
            [params.roleId]
        );
        if (params.permissionKeys.length > 0) {
            const values = params.permissionKeys
            .map((_, i) => `($1, $${i + 2})`)
            .join(", ");
            await client.query(
            `
            INSERT INTO workspace_role_permissions (role_id, permission_key)
            VALUES ${values}
            `,
            [params.roleId, ...params.permissionKeys]
            );
        }
        await client.query("COMMIT");
        return true;
        } catch (e) {
        try { await client.query("ROLLBACK"); } catch {}
        console.error("[WorkspaceTeamEngine.updateRolePermissions]", e);
        return false;
        } finally {
        client.release();
        }
    },

    async deleteRole(params: { roleId: string }) {
        const r = await pgPool.query(
        `
        DELETE FROM workspace_roles
        WHERE id = $1 AND is_system = false
        RETURNING id
        `,
        [params.roleId]
        );
        return r.rows.length > 0;
    },
    };
