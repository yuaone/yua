"use client";

import { create } from "zustand";

export type GraphNode = {
  id: string;
  type: "message" | "stage";
  label: string;

  role?: string;
  model?: string;
  stage?: string;

  timestamp: number;
  output?: any;

  // ⭐ Timeline/Graph sync
  threadId: string;
  messageId: string;
};

export type GraphEdge = {
  from: string;
  to: string;
};

type GraphState = {
  visible: boolean;
  loading: boolean;

  nodes: GraphNode[];
  edges: GraphEdge[];

  highlightedNode: string | null;
  highlightNode: (id: string | null) => void;

  open: (threadId: string) => Promise<void>;
  close: () => void;
};

export const useGraphStore = create<GraphState>((set) => ({
  visible: false,
  loading: false,

  nodes: [],
  edges: [],

  highlightedNode: null,
  highlightNode: (id) => set({ highlightedNode: id }),

  /** GraphPanel open → 서버에서 Spine Graph 불러옴 */
  open: async (threadId: string) => {
    set({ visible: true, loading: true });

    try {
      const res = await fetch(`/api/chat/spine/graph?threadId=${threadId}`);
      const data = await res.json();

      const safeNodes = (data.nodes ?? []).map((n: any) => ({
        ...n,
        threadId: String(n.threadId ?? threadId),
        messageId: String(n.messageId ?? ""),
      }));

      set({
        loading: false,
        nodes: safeNodes,
        edges: data.edges ?? [],
      });
    } catch (err) {
      console.error("[GraphStore] Load graph error:", err);
      set({ loading: false, nodes: [], edges: [] });
    }
  },

  close: () =>
    set({
      visible: false,
      highlightedNode: null,
    }),
}));
