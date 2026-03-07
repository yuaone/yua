"use client";

import { useEffect, useState } from "react";
import { Folder } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSidebarStore } from "@/store/useSidebarStore";
import { useSafePush } from "@/lib/router/safePush";
import { useBillingGuard } from "@/hooks/useBillingGuard";
import SmartUpgradeModal from "@/components/billing/SmartUpgradeModal";
import CreateProjectModal from "@/components/project/CreateProjectModal";
import { ThreadGroup } from "./ThreadGroup";
import type { Thread } from "@/store/useSidebarStore";
import { PLAN_LIMITS, tierToPlan } from "yua-shared";


export function ProjectSection({
  canPromote,
  threads,
}: {
  canPromote: boolean;
  threads: Thread[];
}) {
  const push = useSafePush();
  const { status } = useAuth();
  const { isHardLocked, tier } = useBillingGuard();
  const {
    projects,
    activeProjectId,
    setActiveContext,
  } = useSidebarStore();

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

    // ✅ 폴더 open 상태(로컬 UI)
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({
    general: true,
  });

  // activeProject는 자동으로 열어둠 (UX)
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
      setUpgradeModalOpen(true);
      return;
    }
    setCreateModalOpen(true);
  };




  return (
    <section className="mb-6 max-lg:mb-4">
      <SmartUpgradeModal
        open={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
      />
      <CreateProjectModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />
      <div className="mb-2 flex items-center justify-between px-1 max-lg:px-0">
        <div className="text-[11px] font-semibold tracking-[0.14em] text-[var(--sb-ink-2)]">
          PROJECTS
        </div>

        <button
          type="button"
          onClick={handleNewProject}
          className="sb-btn-ghost max-lg:text-[12px]"
          disabled={isHardLocked}
        >
          + 새 프로젝트
        </button>
      </div>

      <div className="space-y-1 px-1 max-lg:px-0 max-lg:space-y-0.5">
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
                "rounded-lg px-3 py-2 transition text-left max-lg:px-4 max-lg:py-2.5",
                active ? "bg-[var(--sb-soft)] text-[var(--sb-ink)]" : "hover:bg-[var(--sb-soft)] text-[var(--sb-ink)]",
              ].join(" ")}
            >
              <button
                type="button"
                aria-label={isOpen ? "프로젝트 접기" : "프로젝트 펼치기"}
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
                className={active ? "text-[var(--sb-ink)]" : "text-[var(--sb-ink-2)]"}
              />
              <button
                type="button"
                className="min-w-0 flex-1 truncate text-[14px] font-semibold text-left text-[var(--sb-ink)]"
                onClick={() => {
                  setActiveContext(p.id, null);
                  push(`/project/${p.id}`);
                }}
              >
                {p.name}
              </button>
            </div>

            {isOpen && projectThreads.length > 0 && (
              <div className="pl-6 mt-1 max-lg:pl-4">
                <ThreadGroup label="" threads={projectThreads} />
              </div>
            )}
          </div>
        );
      })}

      {projects.length === 0 && (
        <div className="px-2 py-2 text-xs text-[var(--sb-ink-2)]">
          아직 프로젝트가 없어요. 위에서 생성해주세요.
        </div>
      )}
      </div>
    </section>
  );
}
