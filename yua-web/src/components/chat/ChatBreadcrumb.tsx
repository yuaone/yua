"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSidebarStore } from "@/store/useSidebarStore";

export function ChatBreadcrumb() {
  const { activeProjectId, activeThreadId, projects, threads, setActiveContext } = useSidebarStore();

  const projectName = useMemo(() => {
    if (!activeProjectId) return "General";
    return projects.find((p) => String(p.id) === String(activeProjectId))?.name ?? "Project";
  }, [activeProjectId, projects]);

  const threadTitle = useMemo(() => {
    if (!activeThreadId) return null;
    return threads.find((t) => t.id === activeThreadId)?.title ?? "Chat";
  }, [activeThreadId, threads]);

  const baseHref = activeProjectId ? `/project/${String(activeProjectId)}` : `/chat`;

  return (
    <div className="text-sm text-black/55 flex items-center gap-2">
      <Link
        href={baseHref as any}
        onClick={() => setActiveContext((activeProjectId ?? null) as any, null)}
        className="hover:text-black"
      >
        {projectName}
      </Link>

      {threadTitle ? (
        <>
          <span className="text-black/25">/</span>
          <span className="text-black/70 font-medium truncate max-w-[520px]">{threadTitle}</span>
        </>
      ) : null}
    </div>
  );
}
