import crypto from "crypto";

export type WorkspaceDocWsClaims = {
  docId: string;
  workspaceId: string;
  userId: number;
  role: "owner" | "admin" | "member" | "viewer";
  exp: number;
};

function b64url(buf: Buffer) {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function unb64url(s: string) {
  let out = s.replace(/-/g, "+").replace(/_/g, "/");
  while (out.length % 4) out += "=";
  return Buffer.from(out, "base64");
}

function getSecret() {
  const secret = process.env.DOC_WS_SECRET;
  if (!secret) throw new Error("DOC_WS_SECRET_NOT_SET");
  return secret;
}

export function signWorkspaceDocWsToken(
  claims: Omit<WorkspaceDocWsClaims, "exp">,
  ttlMs = 3 * 60 * 1000
) {
  const payload: WorkspaceDocWsClaims = {
    ...claims,
    exp: Date.now() + ttlMs,
  };
  const body = b64url(Buffer.from(JSON.stringify(payload), "utf8"));
  const sig = b64url(
    crypto.createHmac("sha256", getSecret()).update(body).digest()
  );
  return `${body}.${sig}`;
}

export function verifyWorkspaceDocWsToken(token: string): WorkspaceDocWsClaims {
  const [body, sig] = token.split(".");
  if (!body || !sig) throw new Error("DOC_WS_TOKEN_MALFORMED");

  const expected = b64url(
    crypto.createHmac("sha256", getSecret()).update(body).digest()
  );
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    throw new Error("DOC_WS_TOKEN_BAD_SIGNATURE");
  }

  const claims = JSON.parse(unb64url(body).toString("utf8")) as WorkspaceDocWsClaims;
  if (Date.now() > claims.exp) throw new Error("DOC_WS_TOKEN_EXPIRED");
  return claims;
}

