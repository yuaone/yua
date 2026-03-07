"use client";

import { create } from "zustand";
import type { MemoryIndicatorState } from "yua-shared/memory/types";

interface MemoryIndicatorStateStore {
  state: MemoryIndicatorState;
  message: string | null;

  setPending(): void;
  setSaved(message?: string): void;
  setFailed(message?: string): void;
  reset(): void;
}

export const useMemoryIndicator = create<MemoryIndicatorStateStore>(
  (set) => ({
    state: "idle",
    message: null,

    setPending() {
      set({ state: "pending", message: null });
    },

    setSaved(message) {
      set({
        state: "saved",
        message: message ?? "이 내용은 기억해두었어요",
      });
    },

    setFailed(message) {
      set({
        state: "failed",
        message: message ?? "기억 저장에 실패했어요",
      });
    },

    reset() {
      set({ state: "idle", message: null });
    },
  })
);
