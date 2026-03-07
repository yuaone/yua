// src/utils/signed-url.ts
// HMAC-SHA256 based asset URL signing / verification

import crypto from "crypto";

const SECRET =
  process.env.ASSET_SIGN_SECRET ||
  (() => {
    console.warn(
      "[SIGNED-URL] ASSET_SIGN_SECRET not set — using random secret. " +
      "All signed URLs will expire on restart! Set ASSET_SIGN_SECRET in .env."
    );
    return crypto.randomBytes(32).toString("hex");
  })();

const DEFAULT_TTL_SEC = 86_400; // 24 hours

/**
 * Generate a signed query string for an asset path.
 *
 * @param path   - The URL path (e.g. `/api/assets/uploads/ws/user/file.png`)
 * @param ttlSec - Token TTL in seconds (default 24 h)
 * @returns       `path?token=<hex>&exp=<epoch>`
 */
export function signAssetUrl(
  path: string,
  ttlSec: number = DEFAULT_TTL_SEC,
): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const token = generateToken(path, exp);

  // Strip any existing token/exp query params to avoid duplication
  const cleanPath = stripSignatureParams(path);
  const sep = cleanPath.includes("?") ? "&" : "?";

  return `${cleanPath}${sep}token=${token}&exp=${exp}`;
}

/**
 * Verify a signed token for the given path + expiry.
 *
 * @returns `true` if valid and not expired
 */
export function verifyAssetToken(
  path: string,
  token: string,
  exp: number | string,
): boolean {
  const expNum = typeof exp === "string" ? parseInt(exp, 10) : exp;
  if (!Number.isFinite(expNum)) return false;

  // Expired?
  if (Math.floor(Date.now() / 1000) > expNum) return false;

  const expected = generateToken(path, expNum);

  // Timing-safe comparison
  const a = Buffer.from(token, "hex");
  const b = Buffer.from(expected, "hex");

  if (a.length !== b.length) return false;

  return crypto.timingSafeEqual(a, b);
}

/**
 * Re-sign a fileUrl that may already contain token/exp params.
 * Strips existing signature, then signs with a fresh TTL.
 */
export function resignFileUrl(
  fileUrl: string,
  ttlSec: number = DEFAULT_TTL_SEC,
): string {
  // Only sign internal asset URLs
  // Accept both relative (/api/assets/...) and absolute (https://…/api/assets/...)
  const idx = fileUrl.indexOf("/api/assets/");
  if (idx === -1) return fileUrl;

  // We sign based on the pathname portion starting from /api/assets/...
  const withoutOrigin = fileUrl.substring(idx);
  const cleanPath = stripSignatureParams(withoutOrigin);

  const exp = Math.floor(Date.now() / 1000) + ttlSec;
  const token = generateToken(cleanPath, exp);
  const sep = cleanPath.includes("?") ? "&" : "?";
  const signedPath = `${cleanPath}${sep}token=${token}&exp=${exp}`;

  // Always return relative path (no origin) so frontend uses Next.js rewrite
  return signedPath;
}

/* ---- internal helpers ---- */

function generateToken(path: string, exp: number): string {
  return crypto
    .createHmac("sha256", SECRET)
    .update(`${path}:${exp}`)
    .digest("hex");
}

function stripSignatureParams(url: string): string {
  try {
    // Handle both full URLs and path-only strings
    const qIdx = url.indexOf("?");
    if (qIdx === -1) return url;

    const basePath = url.substring(0, qIdx);
    const search = url.substring(qIdx + 1);
    const params = new URLSearchParams(search);
    params.delete("token");
    params.delete("exp");
    const remaining = params.toString();
    return remaining ? `${basePath}?${remaining}` : basePath;
  } catch {
    return url;
  }
}
