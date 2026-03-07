export async function agentFetch(
  path: string,
  method: "GET" | "POST" = "GET",
  body?: any
) {
  const AGENT_URL = process.env.AGENT_URL;
  if (!AGENT_URL) {
    console.warn("AGENT_URL not set");
    return { ok: false };
  }

  const url = `${AGENT_URL}${path.startsWith("/") ? path : `/${path}`}`;

  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
    });

    return res.ok ? await res.json() : { ok: false };
  } catch (err) {
    console.error("[agentFetch]", err);
    return { ok: false };
  }
}
