import { create } from "zustand";

type WorkspaceState = {
  activeWorkspaceId: string | null;
  setActiveWorkspaceId: (id: string | null) => void;
};

const KEY = "yua.activeWorkspaceId";

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  activeWorkspaceId:
    typeof window !== "undefined"
      ? window.localStorage.getItem(KEY)
      : null,
  setActiveWorkspaceId: (id) => {
    try {
      if (typeof window !== "undefined") {
        if (!id) window.localStorage.removeItem(KEY);
        else window.localStorage.setItem(KEY, id);
      }
    } catch {}
    set({ activeWorkspaceId: id });
  },
}));
