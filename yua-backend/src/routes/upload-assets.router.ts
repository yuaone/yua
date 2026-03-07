import { Router } from "express";
import path from "path";
import { requireAuthOrApiKey } from "../auth/auth-or-apikey";
import { verifyAssetToken } from "../utils/signed-url";

const router = Router();

const ALLOWED_ORIGINS = (
  process.env.FRONTEND_ORIGIN || "https://yuaone.com"
).split(",").map((o) => o.trim());

function getAllowedOrigin(reqOrigin?: string): string {
  if (!reqOrigin) return ALLOWED_ORIGINS[0];
  if (ALLOWED_ORIGINS.includes(reqOrigin)) return reqOrigin;
  // Allow localhost in development only
  if (process.env.NODE_ENV !== "production" && reqOrigin.startsWith("http://localhost:")) return reqOrigin;
  return ALLOWED_ORIGINS[0];
}

/**
 * GET /api/assets/uploads/:workspaceId/:userId/:file
 *
 * Signed-URL access only.
 * Requires valid `token` + `exp` query parameters (HMAC-SHA256).
 */
router.get("/uploads/:workspaceId/:userId/:file", (req, res) => {
  const { workspaceId, userId, file } = req.params;

  /* ---- path traversal defence ---- */
  const base = path.resolve("/mnt/yua/assets/uploads");
  const filePath = path.join(base, workspaceId, userId, file);
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(base + path.sep) && resolved !== base) {
    return res.status(400).json({ ok: false, error: "INVALID_PATH" });
  }

  /* ---- signed URL verification ---- */
  const token = req.query.token as string | undefined;
  const exp = req.query.exp as string | undefined;

  if (!token || !exp) {
    return res.status(403).json({ ok: false, error: "FORBIDDEN" });
  }

  // The path used for signing is the pathname portion: /api/assets/uploads/:ws/:user/:file
  const signPath = `/api/assets/uploads/${workspaceId}/${userId}/${file}`;

  if (!verifyAssetToken(signPath, token, exp)) {
    return res.status(403).json({ ok: false, error: "FORBIDDEN" });
  }

  /* ---- CORS & caching headers ---- */
  res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
  res.setHeader("Access-Control-Allow-Origin", getAllowedOrigin(req.headers.origin));
  res.setHeader("Cache-Control", "private, max-age=3600");

  return res.sendFile(resolved, (err) => {
    if (err) {
      return res.status(404).json({ ok: false, error: "NOT_FOUND" });
    }
  });
});

// Auth required for other routes under /assets
router.use(requireAuthOrApiKey);

export default router;
