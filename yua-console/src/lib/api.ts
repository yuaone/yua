// 📂 src/lib/api.ts
// 🔒 YUA ONE · Universal API Client (SSOT Final)
// - yua-ai (Core API) 전용
// - agent API는 절대 섞지 않음

import { getToken } from "@/lib/auth.client";

/**
 * yua-ai API Base URL
 * ex) https://api.yuaone.com
 */
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.YUA_API_URL ||
  "";

/* --------------------------------------------------
   Common Types
-------------------------------------------------- */
export type ApiResponse<T> = {
  ok: boolean;
  data?: T;
  error?: string;
};

/* --------------------------------------------------
   Header Builder
-------------------------------------------------- */
function buildHeaders(extra: HeadersInit = {}): HeadersInit {
  const token = getToken();

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

/* --------------------------------------------------
   URL Normalizer
-------------------------------------------------- */
function buildUrl(path: string) {
  if (!API_BASE) {
    throw new Error("API_BASE is not configured");
  }

  if (path.startsWith("http")) return path;

  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

/* --------------------------------------------------
   Core Fetch Wrapper (INTERNAL)
-------------------------------------------------- */
async function coreRequest<T>(
  path: string,
  options: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const url = buildUrl(path);

    const res = await fetch(url, {
      ...options,
      headers: buildHeaders(options.headers),
      cache: "no-store",
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      return {
        ok: false,
        error: json?.error || `Request failed (${res.status})`,
      };
    }

    return {
      ok: true,
      data: json as T,
    };
  } catch (err: any) {
    return {
      ok: false,
      error: err?.message || "Network error",
    };
  }
}

/* --------------------------------------------------
   Public API (SSOT)
-------------------------------------------------- */

/**
 * GET
 * @example apiGet<User[]>("/instance/list")
 */
export async function apiGet<T = any>(
  path: string
): Promise<ApiResponse<T>> {
  return coreRequest<T>(path, { method: "GET" });
}

/**
 * POST
 * @example apiPost("/instance/create", body)
 */
export async function apiPost<T = any>(
  path: string,
  body: any = {}
): Promise<ApiResponse<T>> {
  return coreRequest<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/**
 * ✅ apiRequest
 * - 기존 코드 호환용 alias
 * - projects 쪽 import 에러 해결용
 */
export async function apiRequest<T = any>(
  path: string,
  options: {
    method?: "GET" | "POST" | "PUT" | "DELETE";
    body?: any;
  } = {}
): Promise<ApiResponse<T>> {
  const { method = "GET", body } = options;

  return coreRequest<T>(path, {
    method,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

/* --------------------------------------------------
   ❌ agentFetch 는 여기 없음 (의도적)
   → src/lib/agent.ts 에서 export 되어야 함
-------------------------------------------------- */
