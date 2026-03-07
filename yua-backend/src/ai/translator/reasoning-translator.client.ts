import fetch from "node-fetch";
import crypto from "crypto";

const ENDPOINT = process.env.TRANSLATOR_URL ?? "http://127.0.0.1:8088/translate";
const TIMEOUT_MS = Number(process.env.TRANSLATOR_TIMEOUT_MS ?? 1200);
const CACHE_EPOCH = process.env.TRANSLATOR_CLIENT_CACHE_EPOCH ?? "";
const CLIENT_POLICY_VERSION = crypto
  .createHash("sha1")
  .update(JSON.stringify({ endpoint: ENDPOINT, timeout: TIMEOUT_MS, epoch: CACHE_EPOCH }))
  .digest("hex")
  .slice(0, 12);

// L1 in-memory cache (짧게)
const l1 = new Map<string, { v: string; exp: number }>();
const L1_TTL_MS = 60_000;

// single-flight
const inflight = new Map<string, Promise<string>>();

function keyFor(text: string, target: "ko" | "en") {
  return crypto
    .createHash("sha256")
    .update(`${CLIENT_POLICY_VERSION}\n${target}\n${text}`)
    .digest("hex");
}

export async function translateReasoning(text: string, target: "ko" | "en"): Promise<string> {
  const t = text.trim();
  if (!t) return text;
  console.debug("[TRANSLATOR_CLIENT_CALL]", {
    endpoint: ENDPOINT,
    text: t.slice(0, 60),
    target,
  });

  const key = keyFor(t, target);

  // L1 cache
  const hit = l1.get(key);
  if (hit && hit.exp > Date.now()) return hit.v;

  // single-flight
  const existing = inflight.get(key);
  if (existing) return existing;

  const p = (async () => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);

    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: ctrl.signal,
        body: JSON.stringify({
          text: t,
          target,      // ✅ source 안 보냄: 서버가 감지/캐시/일관 처리
        }),
      });

      if (!res.ok) return text;

      const json: any = await res.json();
      const out = typeof json?.text === "string" ? json.text : text;
      console.debug("[TRANSLATOR_CLIENT_RESULT]", {
        translated: out,
      });

      // L1 set
      l1.set(key, { v: out, exp: Date.now() + L1_TTL_MS });
      return out;
    } catch {
      console.debug("[TRANSLATOR_CLIENT_FAIL]", {
        endpoint: ENDPOINT,
        reason: "timeout_or_fetch_error",
      });
      return text; // ✅ 절대 스트림 깨지면 안 됨
    } finally {
      clearTimeout(timer);
      inflight.delete(key);
    }
  })();

  inflight.set(key, p);
  return p;
}
