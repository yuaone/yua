"use client";

import { create } from "zustand";

type UIState = {
  sidebarOpen: boolean;
  workspaceOpen: boolean;

  toggleSidebar: () => void;
  toggleWorkspace: () => void;
};

export const useChatUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  workspaceOpen: false,

  toggleSidebar: () =>
    set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  toggleWorkspace: () =>
    set((s) => ({ workspaceOpen: !s.workspaceOpen })),
}));
