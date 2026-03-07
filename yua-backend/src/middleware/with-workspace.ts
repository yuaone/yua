import { Request, Response, NextFunction } from "express";
import { WorkspaceContext } from "../ai/workspace/workspace-context";
import { WorkspaceAccess } from "../ai/workspace/workspace-access";
import { isUuid } from "../utils/is-uuid";
import { redisPub } from "../db/redis";

const WS_ROLE_TTL = 300; // 5 minutes

export async function withWorkspace(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const raw =
      (req as any).user?.id ??
      (req as any).user?.userId;
    const userId = Number(raw);
    if (!Number.isFinite(userId) || userId <= 0) {
      return res.status(401).json({ ok: false, error: "auth_required" });
    }

    const headerWs = (req.headers["x-workspace-id"] as string | undefined) ?? "";
    if (isUuid(headerWs)) {
      const cacheKey = `ws:role:${headerWs}:${userId}`;

      // Try Redis cache first
      let role: string | null | undefined;
      try {
        const cached = await redisPub.get(cacheKey);
        if (cached) {
          role = cached;
        }
      } catch (_) {
        // Redis failure — fall through to DB
      }

      // Cache miss — query DB
      if (!role) {
        role = await WorkspaceAccess.getRole(headerWs, userId);
        if (role) {
          try {
            await redisPub.set(cacheKey, role, "EX", WS_ROLE_TTL);
          } catch (_) {
            // Redis failure — non-critical, skip caching
          }
        }
      }

      if (role) {
        (req as any).workspace = { id: headerWs, role };
        next();
        return;
      }
      // D3 fix: explicit workspace ID was provided but user has no access → 403
      return res.status(403).json({ ok: false, error: "workspace_access_denied" });
    }

    // No x-workspace-id header → resolve personal workspace (safe default)
    const ctx = await WorkspaceContext.resolve({ userId });
    (req as any).workspace = { id: ctx.workspaceId, role: ctx.role };

    next();
  } catch (e) {
    return res.status(401).json({ ok: false, error: "workspace_required" });
  }
}
