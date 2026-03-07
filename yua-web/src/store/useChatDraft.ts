"use client";

import { create } from "zustand";

type ChatDraftState = {
  draft: string;
  setDraft: (text: string) => void;
  clearDraft: () => void;
};

const STORAGE_KEY = "yua.chat.draft";

export const useChatDraft = create<ChatDraftState>((set) => ({
  draft:
    typeof window !== "undefined"
      ? localStorage.getItem(STORAGE_KEY) ?? ""
      : "",

  setDraft: (text) => {
    try {
      localStorage.setItem(STORAGE_KEY, text);
    } catch {}
    set({ draft: text });
  },

  clearDraft: () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    set({ draft: "" });
  },
}));
