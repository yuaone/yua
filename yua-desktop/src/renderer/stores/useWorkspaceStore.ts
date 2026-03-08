import { create } from "zustand";

type WorkspaceState = {
  activeWorkspaceId: string | null;
  setActiveWorkspaceId: (id: string | null) => void;
};

const KEY = "yua.activeWorkspaceId";

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  activeWorkspaceId:
    typeof window !== "undefined" ? localStorage.getItem(KEY) : null,
  setActiveWorkspaceId: (id) => {
    try {
      if (!id) localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, id);
    } catch {}
    set({ activeWorkspaceId: id });
  },
}));
