// src/components/sidebar/ThreadSection.tsx
"use client";

import { useMemo } from "react";
import { useSidebarStore } from "@/store/useSidebarStore";
import { ThreadGroup } from "@/components/sidebar/ThreadGroup";

export function ThreadSection() {
  const { threads, activeProjectId } = useSidebarStore();

  // ✅ 컨텍스트 기반: /chat(General) vs /project/:id
  const list = useMemo(() => {
    const pid = activeProjectId ?? null;
    return (threads ?? []).filter(
      (t) => String(t.projectId ?? "null") === String(pid ?? "null")
    );
  }, [threads, activeProjectId]);

  const pinned = list.filter((t) => t.pinned);
  const recent = list.filter((t) => !t.pinned);

  return (
    <section className="px-1">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[11px] font-semibold tracking-[0.14em] text-[var(--sb-ink-2)]">
          
        </div>
        {/* 여기 나중에: 검색/필터 버튼 넣기 좋음 */}
      </div>

      <div className="space-y-4">
        {pinned.length > 0 && <ThreadGroup label="Pinned" threads={pinned} />}
        <ThreadGroup label="채팅" threads={recent} />

        {list.length === 0 && (
          <div className="px-2 py-2 text-xs text-[var(--sb-ink-2)]">
            아직 채팅이 없어요.
          </div>
        )}
      </div>
    </section>
  );
}
