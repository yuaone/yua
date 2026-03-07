"use client";

import { create } from "zustand";

type SettingsTab =
  | "personalization"
  | "notifications"
  | "data"
  | "security"
  | "workspace"
  | "billing"
  | "memory";

type SettingsUIState = {
  open: boolean;
  tab: SettingsTab;

  openSettings: (tab?: SettingsTab) => void;
  closeSettings: () => void;
  setTab: (tab: SettingsTab) => void;
};

export const useSettingsUI = create<SettingsUIState>((set) => ({
  open: false,
  tab: "personalization",

  openSettings(tab = "personalization") {
    set({ open: true, tab });
  },

  closeSettings() {
    set({ open: false });
  },

  setTab(tab) {
    set({ tab });
  },
}));
