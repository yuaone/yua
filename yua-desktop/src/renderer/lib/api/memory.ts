import type { AuthFetch } from "./types";
import type {
  MemoryRecord,
  MemorySummaryResponse,
  MemoryListResponse,
} from "yua-shared/memory/api-types";

// Re-export for convenience
export type { MemoryRecord } from "yua-shared/memory/api-types";

/* =========================
   Memory API Client (SSOT)
   - authFetch handles: token, workspace header, apiUrl resolution
   - Types from yua-shared (SSOT)
========================= */

export type MemorySummary = MemorySummaryResponse["summary"];

export async function fetchMemorySummary(authFetch: AuthFetch): Promise<MemorySummary> {
  const res = await authFetch("/api/memory/summary");
  if (!res.ok) throw new Error("Failed to fetch memory summary");
  const json: MemorySummaryResponse = await res.json();
  return json.summary;
}

export async function fetchMemoryList(
  authFetch: AuthFetch,
  scope?: string
): Promise<MemoryRecord[]> {
  const url = scope
    ? `/api/memory/list?scope=${encodeURIComponent(scope)}`
    : "/api/memory/list";
  const res = await authFetch(url);
  if (!res.ok) throw new Error("Failed to fetch memories");
  const json: MemoryListResponse = await res.json();
  return json.memories;
}

export async function updateMemory(
  authFetch: AuthFetch,
  id: number,
  data: { content?: string; locked?: boolean }
) {
  const res = await authFetch(`/api/memory/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update memory");
  return res.json();
}

export async function deleteMemory(authFetch: AuthFetch, id: number) {
  const res = await authFetch(`/api/memory/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete memory");
  return res.json();
}
