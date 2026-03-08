import { create } from "zustand";
import type { MemoryScope } from "yua-shared/memory/types";

interface MemoryDrawerState {
  open: boolean;
  scope: MemoryScope;
  loading: boolean;

  openDrawer(scope?: MemoryScope): void;
  closeDrawer(): void;
  setScope(scope: MemoryScope): void;
  setLoading(loading: boolean): void;
}

export const useMemoryDrawer = create<MemoryDrawerState>((set) => ({
  open: false,
  scope: "general_knowledge",
  loading: false,

  openDrawer(scope) {
    set({
      open: true,
      scope: scope ?? "general_knowledge",
    });
  },

  closeDrawer() {
    set({
      open: false,
      loading: false,
    });
  },

  setScope(scope) {
    set({ scope });
  },

  setLoading(loading) {
    set({ loading });
  },
}));
