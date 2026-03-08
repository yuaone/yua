import { create } from "zustand";

/* ==============================
   Types
============================== */

export interface Memory {
  id: number;
  content: string;
  scope: string;
  locked: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AuthFetchFn = (url: string, init?: RequestInit) => Promise<Response>;

interface MemoryState {
  memories: Memory[];
  loading: boolean;
  error: string | null;

  /* ---- Actions ---- */
  fetch: (authFetch: AuthFetchFn) => Promise<void>;
  update: (authFetch: AuthFetchFn, id: number, content: string) => Promise<void>;
  delete: (authFetch: AuthFetchFn, id: number) => Promise<void>;
  toggleLock: (authFetch: AuthFetchFn, id: number) => Promise<void>;
}

/* ==============================
   Store
============================== */

export const useMemoryStore = create<MemoryState>((set, get) => ({
  memories: [],
  loading: false,
  error: null,

  /* ---- Fetch all ---- */
  fetch: async (authFetch) => {
    set({ loading: true, error: null });
    try {
      const res = await authFetch("/api/memory");
      if (!res.ok) throw new Error(`GET /api/memory failed (${res.status})`);
      const data = await res.json();
      const list: Memory[] = Array.isArray(data) ? data : data.memories ?? [];
      set({ memories: list, loading: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to fetch memories";
      set({ error: message, loading: false });
    }
  },

  /* ---- Update content ---- */
  update: async (authFetch, id, content) => {
    // Optimistic update
    const prev = get().memories;
    set({
      memories: prev.map((m) =>
        m.id === id ? { ...m, content, updatedAt: new Date().toISOString() } : m,
      ),
    });

    try {
      const res = await authFetch(`/api/memory/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error(`PATCH /api/memory/${id} failed (${res.status})`);
    } catch (err: unknown) {
      // Rollback
      set({ memories: prev });
      const message = err instanceof Error ? err.message : "Failed to update memory";
      set({ error: message });
    }
  },

  /* ---- Delete ---- */
  delete: async (authFetch, id) => {
    const prev = get().memories;
    set({ memories: prev.filter((m) => m.id !== id) });

    try {
      const res = await authFetch(`/api/memory/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`DELETE /api/memory/${id} failed (${res.status})`);
    } catch (err: unknown) {
      // Rollback
      set({ memories: prev });
      const message = err instanceof Error ? err.message : "Failed to delete memory";
      set({ error: message });
    }
  },

  /* ---- Toggle lock ---- */
  toggleLock: async (authFetch, id) => {
    const prev = get().memories;
    const target = prev.find((m) => m.id === id);
    if (!target) return;

    const newLocked = !target.locked;
    set({
      memories: prev.map((m) =>
        m.id === id ? { ...m, locked: newLocked, updatedAt: new Date().toISOString() } : m,
      ),
    });

    try {
      const res = await authFetch(`/api/memory/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locked: newLocked }),
      });
      if (!res.ok) throw new Error(`PATCH /api/memory/${id} lock failed (${res.status})`);
    } catch (err: unknown) {
      // Rollback
      set({ memories: prev });
      const message = err instanceof Error ? err.message : "Failed to toggle lock";
      set({ error: message });
    }
  },
}));
