import { useMemo } from "react";
import { useSidebarStore } from "@/stores/useSidebarStore";
import type { Thread } from "@/stores/useSidebarStore";
import { ThreadGroup } from "@/components/sidebar/ThreadGroup";

function getTimeGroup(createdAt: number | string): string {
  const now = new Date();
  const date = new Date(createdAt);

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 86_400_000);
  const sevenDaysAgo = new Date(startOfToday.getTime() - 7 * 86_400_000);
  const thirtyDaysAgo = new Date(startOfToday.getTime() - 30 * 86_400_000);

  if (date >= startOfToday) return "오늘";
  if (date >= startOfYesterday) return "어제";
  if (date >= sevenDaysAgo) return "이번 주";
  if (date >= thirtyDaysAgo) return "이번 달";
  return "이전";
}

const TIME_GROUP_ORDER = ["오늘", "어제", "이번 주", "이번 달", "이전"] as const;

export function ThreadSection() {
  const { threads, activeProjectId } = useSidebarStore();

  const list = useMemo(() => {
    const pid = activeProjectId ?? null;
    return (threads ?? []).filter(
      (t) => String(t.projectId ?? "null") === String(pid ?? "null")
    );
  }, [threads, activeProjectId]);

  const pinned = list.filter((t) => t.pinned);
  const recent = list.filter((t) => !t.pinned);

  const timeGroups = useMemo(() => {
    const groups = new Map<string, Thread[]>();
    for (const t of recent) {
      const label = getTimeGroup(t.createdAt);
      const arr = groups.get(label);
      if (arr) arr.push(t);
      else groups.set(label, [t]);
    }
    return TIME_GROUP_ORDER.filter((l) => groups.has(l)).map((l) => ({
      label: l,
      threads: groups.get(l)!,
    }));
  }, [recent]);

  return (
    <section className="px-1">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-[11px] font-semibold tracking-[0.14em] text-[var(--sb-ink-2)]" />
      </div>

      <div className="space-y-4">
        {pinned.length > 0 && <ThreadGroup label="Pinned" threads={pinned} />}
        {timeGroups.map((g) => (
          <ThreadGroup key={g.label} label={g.label} threads={g.threads} />
        ))}

        {list.length === 0 && (
          <div className="px-2 py-2 text-xs text-[var(--sb-ink-2)]">
            No chats yet.
          </div>
        )}
      </div>
    </section>
  );
}
