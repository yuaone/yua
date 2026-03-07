// 📂 src/auth/auth.express.ts
// Express Request → Firebase ID Token 검증 + MySQL User Resolve
// ✔ SSOT FINAL
// ✔ Firebase 현실(null 포함) 반영
// ✔ express.d.ts User 확장과 100% 호환
// ✔ auth.server.ts 무수정

import type { Request, Response, NextFunction } from "express";
import { getUserFromRequest } from "./auth.server";

/* ==================================================
   Internal Helper
================================================== */

/**
 * Express Request → Fetch-like Request Adapter
 * - authorization / Authorization / string[] 모두 대응
 * - auth.server.ts 무수정 보장
 */
function makeFetchLikeRequest(req: Request) {
  const rawAuth =
    (req.headers.authorization ??
      (req.headers as any).Authorization ??
      null) as string | string[] | null;

  const authHeader = Array.isArray(rawAuth)
    ? rawAuth[0]
    : typeof rawAuth === "string"
    ? rawAuth
    : null;

  // 🔍 DEBUG

  return {
    headers: {
      get(name: string) {
        if (name.toLowerCase() === "authorization") {
          return authHeader;
        }
        return null;
      },
    },
  };
}

/* ==================================================
   Core Resolver
================================================== */

export async function resolveUserFromExpress(
  req: Request
): Promise<Express.User> {
  const fetchLikeReq = makeFetchLikeRequest(req);
  const user = await getUserFromRequest(fetchLikeReq as any);

  // 🔒 SSOT: Express.User.id === userId
  if ((user as any).id == null) {
    (user as any).id = user.userId;
  }

  return user as Express.User;
}

/* ==================================================
   Alias Export (기존 코드 호환)
================================================== */

export async function getUserFromExpressRequest(req: Request) {
  return resolveUserFromExpress(req);
}

/* ==================================================
   Express Middleware
================================================== */

export async function requireFirebaseAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.log("[AUTH] requireFirebaseAuth ENTER");

  try {
    const user = await getUserFromExpressRequest(req);

    // 🔒 SSOT: req.user는 express.d.ts에서 확장된 Express.User
    req.user = user;

    console.log("[AUTH] middleware SUCCESS userId =", user.userId);

    next();
  } catch (err: any) {
    console.error("[AUTH] middleware FAILED:", err?.message || err);

    return res.status(401).json({
      ok: false,
      error: "unauthorized",
    });
  }
}
