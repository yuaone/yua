// Admin API helper
// Backend rewrites /api/* → http://127.0.0.1:4000/api/*

export async function adminFetch<T = any>(
  path: string,
  options?: RequestInit
): Promise<{ ok: boolean; data?: T; error?: string }> {
  try {
    const res = await fetch(`/api${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      ...options,
    });

    const json = await res.json();
    return json;
  } catch (err: any) {
    return { ok: false, error: err.message ?? "Network error" };
  }
}
