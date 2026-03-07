import { Request, Response, NextFunction } from "express";
import { getUserFromExpressRequest } from "../auth/auth.express";

/**
 * 🔒 Firebase Auth Middleware
 * - req.user 타입은 express.d.ts의 Express.User를 그대로 사용
 * - 별도 Request 확장 ❌
 */
export async function requireFirebaseAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // getUserFromExpressRequest는 반드시 Express.User를 반환해야 함
    req.user = await getUserFromExpressRequest(req);
    next();
  } catch {
    return res.status(401).json({ ok: false, error: "unauthorized" });
  }
}
