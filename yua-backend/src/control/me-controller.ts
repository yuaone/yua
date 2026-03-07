// src/control/me-controller.ts
import { Request, Response } from "express";
import { resolveUserFromExpress } from "../auth/auth.express";
import { db } from "../db/mysql";
import type { RowDataPacket, ResultSetHeader } from "mysql2/promise";

import { WorkspaceContext } from "../ai/workspace/workspace-context";
import { WorkspacePlanService } from "../ai/plan/workspace-plan.service";
import { pgPool } from "../db/postgres";
import { WorkspaceTeamEngine } from "../ai/workspace/workspace-team.engine";

/* =========================
   Types (SSOT)
========================= */

type WorkspaceRole = "owner" | "admin" | "member" | "viewer";

type AuthProvider = "google" | "email";
type MeProfilePayload = {
  name?: string;
  phone?: string;
  birth_date?: string; // YYYY-MM-DD
  auth_provider?: AuthProvider;
};

/* =========================
   Helpers
========================= */

function resolveRoleByEmail(email: string | null): WorkspaceRole {
  const raw = process.env.ADMIN_EMAILS || "";
  const admins = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  if (!email) return "member";
  return admins.includes(email.toLowerCase()) ? "admin" : "member";
}

/**
 * PG workspaces.name 은 있으면 읽고, 없으면 fallback
 * (스키마가 다르면 try/catch로 안전하게 무시)
 */
async function getWorkspaceNameSafe(workspaceId: string, fallback: string) {
  try {
    const r = await pgPool.query<{ name: string | null }>(
      `SELECT name FROM workspaces WHERE id = $1 LIMIT 1`,
      [workspaceId]
    );
    return (r.rows[0]?.name ?? "").trim() || fallback;
  } catch {
    return fallback;
  }
}

async function resolveOrCreateUser(params: {
  firebaseUid: string;
  email: string | null;
  firebaseName: string | null;
}) {
  const { firebaseUid, email, firebaseName } = params;

  const [uRows] = await db.query<RowDataPacket[]>(
    `
    SELECT id, email, name
    FROM users
    WHERE firebase_uid = ?
    LIMIT 1
    `,
    [firebaseUid]
  );

  let userId: number;
  let resolvedEmail = email;
  let resolvedName = firebaseName;

  if (uRows.length === 0) {
    const [r] = await db.query<ResultSetHeader>(
      `
      INSERT INTO users (firebase_uid, email, name)
      VALUES (?, ?, ?)
      `,
      [firebaseUid, email ?? `${firebaseUid}@user.local`, firebaseName]
    );

    userId = Number(r.insertId);
    resolvedEmail = email ?? `${firebaseUid}@user.local`;
    resolvedName = firebaseName;
  } else {
    userId = Number(uRows[0].id);
    resolvedEmail = (uRows[0].email as string) ?? email;
    resolvedName = (uRows[0].name as string) ?? firebaseName;

    if (!uRows[0].name && firebaseName) {
      await db.query(`UPDATE users SET name = ? WHERE id = ?`, [
        firebaseName,
        userId,
      ]);
    }
  }

  return { userId, resolvedEmail, resolvedName };
}

async function buildMeResponse(params: {
  userId: number;
  resolvedEmail: string | null;
  resolvedName: string | null;
}) {
  const { userId, resolvedEmail, resolvedName } = params;

  const ctx = await WorkspaceContext.resolve({ userId }); // ctx.workspaceId = UUID
  const workspaceId = ctx.workspaceId;

  const fallbackName = `${resolvedName ?? "Personal"} Workspace`;
  const workspaceName = await getWorkspaceNameSafe(workspaceId, fallbackName);

  const envRole = resolveRoleByEmail(resolvedEmail);
  const workspaceRole: WorkspaceRole =
    ctx.role === "owner" ? "owner" : envRole === "admin" ? "admin" : ctx.role;

  const workspacePlan = await WorkspacePlanService.getTier(workspaceId);

  await WorkspaceTeamEngine.acceptPendingInvitesForEmail({
    userId,
    email: resolvedEmail,
  });

  await WorkspaceTeamEngine.autoJoinByDomain({
    userId,
    email: resolvedEmail,
  });

  await WorkspaceTeamEngine.autoJoinBySso({
    userId,
    email: resolvedEmail,
  });

  const workspaces = await WorkspaceTeamEngine.listWorkspacesForUser(userId);

  return {
    ok: true,
    user: {
      id: String(userId),
      email: resolvedEmail,
      name: resolvedName,
    },
    workspace: {
      id: workspaceId,
      name: workspaceName,
      plan: workspacePlan,
    },
    role: workspaceRole,
    workspaces,
  };
}

function normalizeMePayload(body: any): Required<Pick<MeProfilePayload, "name" | "phone" | "birth_date">> & {
  auth_provider: AuthProvider | null;
} {
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const phoneRaw = typeof body?.phone === "string" ? body.phone.trim() : "";
  const birthRaw = typeof body?.birth_date === "string" ? body.birth_date.trim() : "";
  const phone = phoneRaw.length > 0 ? phoneRaw : "";
  const birth_date = birthRaw.length > 0 ? birthRaw : "";
  const ap = body?.auth_provider;
  const auth_provider: AuthProvider | null = ap === "google" || ap === "email" ? ap : null;

  return { name, phone, birth_date, auth_provider };
}

/* =========================
   Controller (SSOT)
========================= */

export async function getMeController(req: Request, res: Response) {
  try {
    /* --------------------------------------------------
       1) Auth Resolve (Firebase SSOT)
    -------------------------------------------------- */
    const authUser = await resolveUserFromExpress(req);
    if (!authUser) {
      return res.status(401).json({ ok: false, error: "unauthorized" });
    }

    const firebaseUid = authUser.firebaseUid;
    const email = authUser.email ?? null;
    const firebaseName = authUser.name ?? null;

   const { userId, resolvedEmail, resolvedName } = await resolveOrCreateUser({
      firebaseUid,
      email,
      firebaseName,
    });

    return res.json(await buildMeResponse({ userId, resolvedEmail, resolvedName }));

  } catch (err: any) {
    console.error("❌ /me error:", err);
    return res.status(401).json({
      ok: false,
      error: "unauthorized",
      message: err?.message ?? "Unauthorized",
    });
  }
}

// ✅ 회원가입 프로필 저장 (MySQL users.phone/birth_date/auth_provider)
export async function postMeController(req: Request, res: Response) {
  try {
    const authUser = await resolveUserFromExpress(req);
    if (!authUser) {
      return res.status(401).json({ ok: false, error: "unauthorized" });
    }

    const firebaseUid = authUser.firebaseUid;
    const email = authUser.email ?? null;
    const firebaseName = authUser.name ?? null;

    const { userId, resolvedEmail, resolvedName } = await resolveOrCreateUser({
      firebaseUid,
      email,
      firebaseName,
    });

    const payload = normalizeMePayload(req.body ?? {});
    const resolvedProvider =
      (authUser as any)?.authProvider === "google" || (authUser as any)?.authProvider === "email"
        ? ((authUser as any).authProvider as AuthProvider)
        : payload.auth_provider;

    if (!payload.name) {
      return res.status(400).json({ ok: false, error: "invalid_payload" });
    }
    if (resolvedProvider !== "google") {
      if (!payload.phone || !payload.birth_date) {
        return res.status(400).json({ ok: false, error: "invalid_payload" });
      }
    }

    await db.query(
      `
      UPDATE users
      SET
        name = ?,
        phone = COALESCE(NULLIF(?, ''), phone),
        birth_date = COALESCE(NULLIF(?, ''), birth_date),
        auth_provider = COALESCE(?, auth_provider),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [
        payload.name,
        payload.phone,
        payload.birth_date,
        resolvedProvider ?? payload.auth_provider, // 'email' | 'google' | null
        userId,
      ]
    );

    // 저장 직후 최신 응답을 같은 shape로 리턴
    return res.json(
      await buildMeResponse({
        userId,
        resolvedEmail,
        resolvedName: payload.name || resolvedName,
      })
    );
  } catch (err: any) {
    console.error("❌ POST /me error:", err);
    return res.status(500).json({
      ok: false,
      error: "me_profile_save_failed",
      message: err?.message ?? "ME_PROFILE_SAVE_FAILED",
    });
  }
}
