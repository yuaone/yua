// src/store/useLoginModal.ts
"use client";

import { create } from "zustand";

type LoginModalState = {
  open: boolean;
  title?: string;
  afterLogin?: () => void;
  openModal: (opts?: {
    title?: string;
    afterLogin?: () => void;
  }) => void;
  closeModal: () => void;
};

export const useLoginModal = create<LoginModalState>((set) => ({
  open: false,
  title: undefined,
  afterLogin: undefined,

  openModal: (opts) =>
    set({
      open: true,
      title: opts?.title,
      afterLogin: opts?.afterLogin,
    }),

  closeModal: () =>
    set({
      open: false,
      title: undefined,
      afterLogin: undefined,
    }),
}));
