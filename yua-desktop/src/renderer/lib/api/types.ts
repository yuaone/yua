export type AuthFetch = (
  input: RequestInfo | URL,
  init?: RequestInit
) => Promise<Response>;
