import { Request, Response, NextFunction } from "express";

export type AdminRole = "superadmin" | "admin" | "support" | "billing_manager" | "viewer";

/**
 * Factory: returns middleware that checks req.admin.role against allowed roles.
 * Superadmin always passes.
 */
export function requireRole(...roles: AdminRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const admin = req.admin;
    if (!admin) {
      return res.status(401).json({ ok: false, error: "Admin session required" });
    }

    if (admin.role === "superadmin" || roles.includes(admin.role as AdminRole)) {
      return next();
    }

    return res.status(403).json({ ok: false, error: "Insufficient permissions" });
  };
}
