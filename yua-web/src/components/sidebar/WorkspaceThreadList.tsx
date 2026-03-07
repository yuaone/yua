"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useSidebarStore } from "@/store/useSidebarStore";
import { useWorkspaceStore } from "@/store/store/useWorkspaceStore";
import { ThreadGroup } from "./ThreadGroup";
import { ProjectSection } from "./ProjectSection";
import WorkspaceGroupHeader from "./WorkspaceGroupHeader";

type Props = {
  canPromote: boolean;
};

export default function WorkspaceThreadList({ canPromote }: Props) {
  const { profile } = useAuth();
  const { threadGroups, threads, toggleGroupCollapse } = useSidebarStore();
  const activeWsId = useWorkspaceStore((s) => s.activeWorkspaceId);

  const myRole = profile?.role ?? "member";
  const isOwner = myRole === "owner";

  // Owner sees flat view (no workspace grouping - they ARE the workspace)
  // Also fallback for no groups loaded (backward compat)
  if (isOwner || !threadGroups || threadGroups.length === 0) {
    const allThreads = isOwner && threadGroups?.length
      ? threadGroups.flatMap(g => g.threads)
      : (threads ?? []);
    const generalThreads = allThreads.filter((t) => !t.projectId);
    return (
      <>
        <ProjectSection canPromote={canPromote} threads={allThreads} />
        <div className="h-px bg-[var(--sb-line)]" />
        {generalThreads.length > 0 && (
          <div className="space-y-1 px-1">
            <ThreadGroup label="" threads={generalThreads} />
          </div>
        )}
      </>
    );
  }

  // Invited members see grouped threads by workspace
  // Filter out empty workspace groups (design decision: hide empty)
  const visibleGroups = threadGroups.filter(g => g.threadCount > 0);

  return (
    <div className="space-y-1">
      {visibleGroups.map((group) => {
        const generalThreads = group.threads.filter(t => !t.projectId);
        const isActive = activeWsId === group.workspace.id;

        return (
          <div key={group.workspace.id}>
            <WorkspaceGroupHeader
              workspace={group.workspace}
              threadCount={group.threadCount}
              collapsed={group.collapsed}
              onToggle={() => toggleGroupCollapse(group.workspace.id)}
            />

            {!group.collapsed && (
              <div className="ml-2 space-y-0.5">
                {/* Projects section only for active workspace */}
                {isActive && (
                  <ProjectSection canPromote={canPromote} threads={group.threads} />
                )}

                {generalThreads.length > 0 && (
                  <ThreadGroup label="" threads={generalThreads} />
                )}

                {group.hasMore && (
                  <div className="px-2 py-1">
                    <span className="text-[11px] text-[var(--sb-ink-2)] opacity-60">
                      +{group.threadCount - group.threads.length} more
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
