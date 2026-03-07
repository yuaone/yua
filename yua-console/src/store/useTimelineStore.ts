"use client";

import { create } from "zustand";

/** 🔥 Spine Timeline 구조: messageId 반드시 포함 */
export type TimelineChunk = {
  stage: string;
  timestamp: number;
  output: any;
  messageId: string;  // ⭐ Jump 기능에 반드시 필요
};

type TimelineState = {
  visible: boolean;
  threadId: string | null;
  messageId: string | null;
  timeline: TimelineChunk[];
  loading: boolean;

  open: (threadId: string, messageId: string) => Promise<void>;
  close: () => void;
};

export const useTimelineStore = create<TimelineState>((set) => ({
  visible: false,
  threadId: null,
  messageId: null,
  timeline: [],
  loading: false,

  /** ⭐ Spine Timeline 불러오기 */
  open: async (threadId, messageId) => {
    set({ visible: true, loading: true, threadId, messageId });

    const res = await fetch(
      `/api/chat/spine/timeline?threadId=${threadId}&messageId=${messageId}`,
      { cache: "no-store" }
    );
    const data = await res.json();

    // 서버에서 messageId를 포함해주도록 강제 보정 처리 ⭐
    const timeline = (data.timeline ?? []).map((item: any) => ({
      stage: item.stage,
      output: item.output,
      timestamp: item.timestamp,
      messageId: item.messageId ?? messageId, // fallback 보정
    }));

    set({
      timeline,
      loading: false,
    });
  },

  close: () =>
    set({
      visible: false,
      threadId: null,
      messageId: null,
    }),
}));
