import { createMobileAuthFetch } from "@/adapters/stream/mobileStreamTransport";

export const mobileAuthFetch = createMobileAuthFetch({
  defaultAccept: "application/json",
});

export async function mobileApiJson<T>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<T> {
  const res = await mobileAuthFetch(input, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new Error(`API_FAILED:${res.status}`);
  }
  return (await res.json()) as T;
}
