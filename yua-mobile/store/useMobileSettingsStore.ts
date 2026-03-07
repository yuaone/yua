import { create } from "zustand";

type MobileSettingsState = {
  visible: boolean;
  openSettings: () => void;
  closeSettings: () => void;
};

export const useMobileSettingsStore = create<MobileSettingsState>((set) => ({
  visible: false,
  openSettings: () => set({ visible: true }),
  closeSettings: () => set({ visible: false }),
}));
