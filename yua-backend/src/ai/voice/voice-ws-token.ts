import crypto from "crypto";

type Claims = {
  sessionId: string;
  threadId: number;
  workspaceId: string;
  userId: number;
  traceId: string;
  exp: number; // epoch ms
};

function b64url(buf: Buffer) {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function unb64url(s: string) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) s += "=";
  return Buffer.from(s, "base64");
}

export function signVoiceWsToken(
  claims: Omit<Claims, "exp">,
  ttlMs = 5 * 60 * 1000
) {
  const secret = process.env.VOICE_WS_SECRET;
  if (!secret) throw new Error("VOICE_WS_SECRET_NOT_SET");

  const payload: Claims = { ...claims, exp: Date.now() + ttlMs };
  const body = b64url(Buffer.from(JSON.stringify(payload), "utf8"));
  const sig = b64url(
    crypto.createHmac("sha256", secret).update(body).digest()
  );
  return `${body}.${sig}`;
}

export function verifyVoiceWsToken(token: string): Claims {
  const secret = process.env.VOICE_WS_SECRET;
  if (!secret) throw new Error("VOICE_WS_SECRET_NOT_SET");

  const [body, sig] = token.split(".");
  if (!body || !sig) throw new Error("VOICE_WS_TOKEN_MALFORMED");

  const expected = b64url(
    crypto.createHmac("sha256", secret).update(body).digest()
  );
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    throw new Error("VOICE_WS_TOKEN_BAD_SIGNATURE");
  }

  const claims = JSON.parse(unb64url(body).toString("utf8")) as Claims;
  if (Date.now() > claims.exp) throw new Error("VOICE_WS_TOKEN_EXPIRED");
  return claims;
}