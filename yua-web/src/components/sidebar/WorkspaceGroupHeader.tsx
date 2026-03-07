"use client";

import { ChevronRight, Home, Building2 } from "lucide-react";
import { useWorkspaceStore } from "@/store/store/useWorkspaceStore";
import type { WorkspaceInfo } from "@/store/useSidebarStore";

type Props = {
  workspace: WorkspaceInfo;
  threadCount: number;
  collapsed: boolean;
  onToggle: () => void;
};

export default function WorkspaceGroupHeader({ workspace, threadCount, collapsed, onToggle }: Props) {
  const activeWsId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const isActive = activeWsId === workspace.id;
  const isPersonal = workspace.type === "personal";

  return (
    <button
      onClick={onToggle}
      className={`
        group flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left
        transition-all duration-150 ease-out
        hover:bg-[var(--sb-soft)]
        ${isActive ? "bg-[var(--sb-soft)] text-[var(--sb-active-ink)]" : "text-[var(--sb-ink-2)]"}
      `}
    >
      <ChevronRight
        size={14}
        className={`shrink-0 transition-transform duration-150 ${collapsed ? "" : "rotate-90"}`}
      />
      {isPersonal ? (
        <Home size={14} className="shrink-0" />
      ) : (
        <Building2 size={14} className="shrink-0" />
      )}
      <span className="truncate text-[12px] font-semibold tracking-wide uppercase">
        {workspace.name}
      </span>
      {threadCount > 0 && (
        <span className="ml-auto shrink-0 rounded-full bg-[var(--sb-soft)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--sb-ink-2)]">
          {threadCount}
        </span>
      )}
    </button>
  );
}
