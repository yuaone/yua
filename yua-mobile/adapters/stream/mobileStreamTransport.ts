import { getMobileToken } from "@/lib/auth/mobileTokenProvider";

const DEFAULT_API_BASE = "http://127.0.0.1:4000";

function resolveApiBaseUrl(): string {
  const raw = process.env.EXPO_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE;
  return raw.replace(/\/+$/, "");
}

export function buildStreamUrl(threadId: number): string {
  const base = resolveApiBaseUrl();
  const url = new URL("/api/stream/stream", base);
  url.searchParams.set("threadId", String(threadId));
  return url.toString();
}

export function resolveApiUrl(input: RequestInfo | URL): string {
  if (input instanceof URL) return input.toString();
  if (typeof input !== "string") return String(input);

  if (/^https?:\/\//i.test(input)) return input;

  const base = resolveApiBaseUrl();
  const path = input.startsWith("/") ? input : `/${input}`;
  return `${base}${path}`;
}

type CreateMobileAuthFetchOptions = {
  defaultAccept?: string;
};

export function createMobileAuthFetch(options?: CreateMobileAuthFetchOptions) {
  return async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const token = await getMobileToken();

    const headers = new Headers(init?.headers ?? {});
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    if (options?.defaultAccept && !headers.has("Accept")) {
      headers.set("Accept", options.defaultAccept);
    }

    const finalUrl = resolveApiUrl(input);
    return fetch(finalUrl, { ...init, headers });
  };
}
