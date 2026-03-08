import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Folder } from "lucide-react";
import { useAuth } from "@/contexts/DesktopAuthContext";
import { useSidebarStore } from "@/stores/useSidebarStore";
import { useBillingGuard } from "@/hooks/useBillingGuard";
import { ThreadGroup } from "./ThreadGroup";
import type { Thread } from "@/stores/useSidebarStore";
import { PLAN_LIMITS, tierToPlan } from "yua-shared";

export function ProjectSection({
  canPromote,
  threads,
}: {
  canPromote: boolean;
  threads: Thread[];
}) {
  const navigate = useNavigate();
  const { status } = useAuth();
  const { isHardLocked, tier } = useBillingGuard();
  const { projects, activeProjectId, setActiveContext } = useSidebarStore();

  const [openMap, setOpenMap] = useState<Record<string, boolean>>({
    general: true,
  });

  // Auto-open active project folder
  useEffect(() => {
    const key = activeProjectId ? String(activeProjectId) : "general";
    setOpenMap((m) => (m[key] ? m : { ...m, [key]: true }));
  }, [activeProjectId]);

  const handleNewProject = () => {
    if (status !== "authed") return;
    if (isHardLocked) return;

    const plan = tierToPlan(tier ?? "free");
    const limit = PLAN_LIMITS[plan].maxProjects;
    if (limit !== "UNLIMITED" && projects.length >= limit) {
      // Desktop: upgrade flow TBD
      return;
    }
    // Desktop: create project modal TBD
  };

  return (
    <section className="mb-6">
      <div className="mb-2 flex items-center justify-between px-1">
        <div className="text-[11px] font-semibold tracking-[0.14em] text-[var(--sb-ink-2)]">
          PROJECTS
        </div>

        <button
          type="button"
          onClick={handleNewProject}
          className="sb-btn-ghost"
          disabled={isHardLocked}
        >
          + New Project
        </button>
      </div>

      <div className="space-y-1 px-1">
        {projects.map((p) => {
          const pid = String(p.id);
          const projectThreads = (threads ?? []).filter(
            (t) => String(t.projectId ?? "") === pid
          );

          const active = String(p.id) === String(activeProjectId);
          const isOpen = openMap[pid] ?? active;

          return (
            <div key={pid}>
              <div
                className={[
                  "group w-full flex items-center gap-2",
                  "rounded-lg px-3 py-2 transition text-left",
                  active
                    ? "bg-[var(--sb-soft)] text-[var(--sb-ink)]"
                    : "hover:bg-[var(--sb-soft)] text-[var(--sb-ink)]",
                ].join(" ")}
              >
                <button
                  type="button"
                  aria-label={isOpen ? "Collapse project" : "Expand project"}
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenMap((m) => ({
                      ...m,
                      [pid]: !isOpen,
                    }));
                  }}
                  className="shrink-0 text-[var(--sb-ink-2)] hover:text-[var(--sb-ink)]"
                >
                  {isOpen ? "▾" : "▸"}
                </button>
                <Folder
                  size={16}
                  className={
                    active
                      ? "text-[var(--sb-ink)]"
                      : "text-[var(--sb-ink-2)]"
                  }
                />
                <button
                  type="button"
                  className="min-w-0 flex-1 truncate text-[14px] font-semibold text-left text-[var(--sb-ink)]"
                  onClick={() => {
                    setActiveContext(p.id, null);
                    navigate(`/project/${p.id}`);
                  }}
                >
                  {p.name}
                </button>
              </div>

              {isOpen && projectThreads.length > 0 && (
                <div className="pl-6 mt-1">
                  <ThreadGroup label="" threads={projectThreads} />
                </div>
              )}
            </div>
          );
        })}

        {projects.length === 0 && (
          <div className="px-2 py-2 text-xs text-[var(--sb-ink-2)]">
            No projects yet. Create one above.
          </div>
        )}
      </div>
    </section>
  );
}
