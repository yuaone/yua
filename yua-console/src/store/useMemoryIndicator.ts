"use client";

import { create } from "zustand";

/**
 * Memory Indicator State
 * - idle: 아무 일 없음
 * - pending: 메모리 저장 가능성 있음
 * - saved: 메모리 저장 완료
 * - failed: 저장 실패
 */
export type MemoryIndicatorStatus =
  | "idle"
  | "pending"
  | "saved"
  | "failed";

type MemoryIndicatorState = {
  status: MemoryIndicatorStatus;
  message?: string;

  setIdle: () => void;
  setPending: () => void;
  setSaved: (msg?: string) => void;
  setFailed: (msg?: string) => void;
};

export const useMemoryIndicator = create<MemoryIndicatorState>((set) => ({
  status: "idle",
  message: undefined,

  setIdle: () =>
    set({
      status: "idle",
      message: undefined,
    }),

  setPending: () =>
    set({
      status: "pending",
      message: "이 대화는 기억될 수 있어요",
    }),

  setSaved: (msg) =>
    set({
      status: "saved",
      message: msg ?? "기억에 저장되었어요",
    }),

  setFailed: (msg) =>
    set({
      status: "failed",
      message: msg ?? "기억 저장에 실패했어요",
    }),
}));
