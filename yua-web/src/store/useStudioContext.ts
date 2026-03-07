"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AttachmentMeta } from "yua-shared/chat/attachment-types";

/* ==============================
   Types
============================== */

export type StudioMode = "document" | "image" | "video";

export type StudioEntryContext = {
  mode: StudioMode;
  input: string;

  /** 🔥 Chat → Studio 전달 메타 (persist-safe) */
  attachments?: AttachmentMeta[];

  /** Chat ↔ Studio 연결 고리 (SSOT) */
  threadId: number | null;
  sectionId: number;
  /** 권한 / 검증용 */
  workspaceId?: string;
  reason?: string;

  /** 진입 시각 (TTL 기준) */
  enteredAt: number;
};

type StudioContextState = {
  /* ---------- State ---------- */
  entry: StudioEntryContext | null;
  active: boolean;

  /* ---------- Derived ---------- */
  hasEntry: () => boolean;
  isSameThread: (threadId: number) => boolean;

  /* ---------- Actions ---------- */
  openStudio: (ctx: Omit<StudioEntryContext, "enteredAt">) => void;
  updateInput: (input: string) => void;
  closeStudio: () => void;
  clear: () => void;
};

/* ==============================
   Constants (SSOT)
============================== */

const STORAGE_KEY = "yua-studio-context";
const TTL_MS = 1000 * 60 * 30; // 30분

/* ==============================
   Store (SSOT)
============================== */

export const useStudioContext = create<StudioContextState>()(
  persist(
    (set, get) => ({
      entry: null,
      active: false,

      /* ---------- Derived ---------- */
      hasEntry() {
        return !!get().entry;
      },

 isSameThread(threadId: number | null) {
   return get().entry?.threadId === threadId;
 },

      /* ---------- Open (Chat → Studio) ---------- */
      openStudio(ctx) {
        const current = get().entry;

        // 🚫 다른 thread에서 이미 활성화된 경우 차단
        if (
          current &&
          get().active &&
          current.threadId !== ctx.threadId
        ) {
          console.warn(
            "[STUDIO] another studio already active, ignoring open"
          );
          return;
        }

        set({
          entry: {
            ...ctx,
            enteredAt: Date.now(),
          },
          active: true,
        });
      },

      /* ---------- Update Input ---------- */
      updateInput(input) {
        const entry = get().entry;
        if (!entry) return;

        set({
          entry: {
            ...entry,
            input,
          },
        });
      },

      /* ---------- Close (UI only) ---------- */
      closeStudio() {
        set({ active: false });
      },

      /* ---------- Clear (Hard reset) ---------- */
      clear() {
        set({
          entry: null,
          active: false,
        });
      },
    }),
    {
      name: STORAGE_KEY,
      version: 3,

      /* persist 최소화 */
      partialize: (state) => ({
        entry: state.entry,
        active: state.active,
      }),

      /* TTL + Route Guard */
      onRehydrateStorage: () => (state) => {
        if (!state?.entry) return;

        const expired =
          Date.now() - state.entry.enteredAt > TTL_MS;

        // Clear if expired
        if (expired) {
          console.info("[STUDIO] context expired, clearing");
          state.entry = null;
          state.active = false;
          return;
        }

        // Clear persisted active state if not on a studio route
        // (prevents redirect loop on page load from non-studio pages)
        if (typeof window !== "undefined") {
          const path = window.location.pathname;
          const isStudioRoute = path.startsWith("/studio");
          if (state.active && !isStudioRoute && state.entry.mode !== "image") {
            console.info("[STUDIO] not on studio route, clearing persisted active state");
            state.entry = null;
            state.active = false;
          }
        }
      },
    }
  )
);

/* ==============================
   Selectors
============================== */

export const useStudioEntry = () =>
  useStudioContext((s) => s.entry);

export const useStudioActive = () =>
  useStudioContext((s) => s.active);

export const useStudioThreadId = () =>
  useStudioContext((s) => s.entry?.threadId ?? null);
