import { create } from "zustand";

type StudioContextState = {
  studioOpen: boolean;
  openStudio: () => void;
  closeStudio: () => void;
};

export const useStudioContext = create<StudioContextState>((set) => ({
  studioOpen: false,
  openStudio: () => set({ studioOpen: true }),
  closeStudio: () => set({ studioOpen: false }),
}));
