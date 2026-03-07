"use client";

import { useCallback } from "react";
import { useWorkspaceStore } from "@/store/store/useWorkspaceStore";
import { useChatStore } from "@/store/useChatStore";

/**
 * Workspace Transition (V2 - Light Switch)
 *
 * Only changes activeWorkspaceId and resets active stream.
 * Does NOT reset sidebar (grouped threads persist).
 * Does NOT reset chat messages (for back-navigation).
 */
export function useWorkspaceTransition() {
  const setActiveWorkspaceId = useWorkspaceStore(
    (s) => s.setActiveWorkspaceId
  );
  const resetStreamState = useChatStore((s) => s.resetStreamState);

  return useCallback(
    async (workspaceId: string) => {
      const current =
        useWorkspaceStore.getState().activeWorkspaceId ?? null;

      if (!workspaceId || current === workspaceId) return;

      // 1. workspace commit
      setActiveWorkspaceId(workspaceId);

      // 2. stop active stream (prevent cross-workspace event leak)
      resetStreamState();
    },
    [setActiveWorkspaceId, resetStreamState]
  );
}
