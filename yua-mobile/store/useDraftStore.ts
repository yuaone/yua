import { create } from "zustand";
import AsyncStorage from "@react-native-async-storage/async-storage";

/* ==============================
   Constants
============================== */

const STORAGE_KEY = "yua.drafts";
const DEBOUNCE_MS = 300;

/* ==============================
   Types
============================== */

interface DraftState {
  drafts: Record<string, string>;
  _loaded: boolean;

  /* ---- Lifecycle ---- */
  load: () => Promise<void>;

  /* ---- CRUD ---- */
  setDraft: (key: string, text: string) => void;
  getDraft: (key: string) => string;
  clearDraft: (key: string) => void;
}

/* ==============================
   Internal helpers
============================== */

let _saveTimer: ReturnType<typeof setTimeout> | null = null;

function debouncedSave(drafts: Record<string, string>) {
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    try {
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
    } catch {
      // silent
    }
  }, DEBOUNCE_MS);
}

function saveImmediate(drafts: Record<string, string>) {
  if (_saveTimer) clearTimeout(_saveTimer);
  try {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
  } catch {
    // silent
  }
}

/* ==============================
   Store
============================== */

export const useDraftStore = create<DraftState>((set, get) => ({
  drafts: {},
  _loaded: false,

  /* ---- Lifecycle ---- */
  load: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, string>;
        set({ drafts: parsed, _loaded: true });
      } else {
        set({ _loaded: true });
      }
    } catch {
      set({ _loaded: true });
    }
  },

  /* ---- CRUD ---- */
  setDraft: (key: string, text: string) => {
    const next = { ...get().drafts, [key]: text };
    set({ drafts: next });
    debouncedSave(next);
  },

  getDraft: (key: string) => {
    return get().drafts[key] ?? "";
  },

  clearDraft: (key: string) => {
    const next = { ...get().drafts };
    delete next[key];
    set({ drafts: next });
    saveImmediate(next);
  },
}));
