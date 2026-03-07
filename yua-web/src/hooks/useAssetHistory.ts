"use client";

import { useMemo } from "react";
import type { ChatMessageWithMeta } from "@/store/useChatStore";
import type { StudioAssetType } from "yua-shared/chat/studio-types";

export type AssetHistoryGroup = {
  sectionId: number;
  assetType: StudioAssetType;
  messages: ChatMessageWithMeta[]; // 오래된 → 최신
  latestAt: number;
};

export function useAssetHistory(
  messages: ChatMessageWithMeta[]
) {
  return useMemo<AssetHistoryGroup[]>(() => {
    const map = new Map<string, AssetHistoryGroup>();

    for (const m of messages) {
      if (m.role !== "system") continue;
      if (!m.meta?.studio?.sectionId) continue;

      const { sectionId, assetType } = m.meta.studio;
      const key = String(sectionId);

 let group = map.get(key);
 if (!group) {
   const newGroup = {
          sectionId,
          assetType,
          messages: [],
          latestAt: m.createdAt,
   };
   map.set(key, newGroup);
   group = newGroup;
      }

      group.messages.push(m);
      group.latestAt = Math.max(group.latestAt, m.createdAt);
    }

    // 메시지 내부 정렬
    map.forEach((group) => {
      group.messages.sort(
        (a, b) => a.createdAt - b.createdAt
      );
    });

    // 🔥 그룹 자체도 최신순 정렬
 return Array.from(map.values()).sort(
   (a, b) => b.latestAt - a.latestAt
 );
  }, [messages]);
}
