import { useEffect, useState, type ReactNode } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { Image, Home, FileText, ChevronsUpDown } from "lucide-react";

import { useAuth } from "@/contexts/DesktopAuthContext";
import { useSidebarStore } from "@/stores/useSidebarStore";
import { useSidebarData } from "@/hooks/useSidebarData";
import { useChatStore } from "@/stores/useChatStore";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";

import SidebarProfilePanel from "@/components/sidebar/SidebarProfilePanel";
import { ThreadSection } from "@/components/sidebar/ThreadSection";
import { ProjectSection } from "@/components/sidebar/ProjectSection";
import { useSidebar } from "@/components/layout/SidebarContext";
import { createThread } from "@/lib/api/sidebar.api";

export default function AppSidebar({
  collapsed = false,
  onToggleCollapse,
}: {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;
  const { closeSidebar } = useSidebar();
  const { status, profile, authFetch } = useAuth();
  const workspaceId = profile?.workspace?.id ?? null;
  const role = profile?.role ?? null;
  const canPromote = role === "owner" || role === "admin";

  const [sidebarMode, setSidebarMode] = useState<"main" | "profile">("main");

  const {
    threads,
    activeThreadId,
    activeProjectId,
    setActiveContext,
    touchThread,
    addThread,
    projects,
    loadingProjects,
  } = useSidebarStore();

  const generalThreads = (threads ?? []).filter((t) => !t.projectId);
  const { messagesByThread } = useChatStore();
  const { loadThreads, loadProjects, loadGroupedThreads } = useSidebarData();

  /**
   * SSOT: URL = state
   * - /project/:id  -> activeProjectId=id, activeThreadId=null
   * - /chat         -> activeProjectId=null, activeThreadId=null
   * - /chat/:id     -> activeThreadId=id, activeProjectId=thread.projectId
   */
  useEffect(() => {
    if (status !== "authed") return;

    if (pathname === "/chat" || pathname === "/") {
      setActiveContext(null, null);
      return;
    }

    // Don't resolve thread/project routes until threads hydrate
    if (!threads || threads.length === 0) {
      return;
    }

    const mProject = pathname.match(/^\/project\/([^/]+)/);
    if (mProject?.[1]) {
      if (loadingProjects) return;

      const pid = String(mProject[1]);
      const exists = projects.some((p) => String(p.id) === pid);
      if (!exists) {
        navigate("/chat", { replace: true });
        return;
      }

      setActiveContext(pid as any, null);
      return;
    }

    const mChat = pathname.match(/^\/chat\/(\d+)/);
    if (mChat?.[1]) {
      const threadId = Number(mChat[1]);
      if (!Number.isFinite(threadId)) return;

      const t = threads.find((x) => x.id === threadId);
      if (!t) return;
      const pid = (t?.projectId ?? null) as any;
      setActiveContext(pid, threadId);
      return;
    }
  }, [status, pathname, threads, setActiveContext, projects, loadingProjects, navigate]);

  /* =========================
     First-time hydration (re-triggers on workspace change)
  ========================= */
  const storeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);

  // Fallback: if workspace not set from store, use profile workspace
  const effectiveWorkspaceId = storeWorkspaceId ?? workspaceId;

  // Sync workspace store from profile if store is empty (browser mode fallback)
  useEffect(() => {
    if (workspaceId && !storeWorkspaceId) {
      useWorkspaceStore.getState().setActiveWorkspaceId(workspaceId);
    }
  }, [workspaceId, storeWorkspaceId]);

  useEffect(() => {
    if (status !== "authed") return;
    if (!effectiveWorkspaceId) return;

    const { threads, loadingThreads, loadingGroups } = useSidebarStore.getState();

    if (threads && threads.length > 0) {
      console.log("[SIDEBAR][HYDRATION] skipped (already hydrated)");
      return;
    }

    if (loadingThreads || loadingGroups) return;

    console.log("[SIDEBAR][HYDRATION] first load, workspace:", effectiveWorkspaceId);

    loadProjects();
    loadGroupedThreads();
  }, [status, effectiveWorkspaceId, loadProjects, loadGroupedThreads]);

  const goToThread = (threadId: number) => {
    if (!Number.isFinite(threadId)) return;
    const t = threads.find((x) => x.id === threadId);
    if (
      role !== "owner" &&
      t?.workspaceId &&
      t.workspaceId !== useWorkspaceStore.getState().activeWorkspaceId
    ) {
      useWorkspaceStore.getState().setActiveWorkspaceId(t.workspaceId);
    }
    setActiveContext((t?.projectId ?? null) as any, threadId);
    touchThread(threadId);
    navigate(`/chat/${threadId}`);
  };

  const [newChatLoading, setNewChatLoading] = useState(false);
  const handleNewChat = async () => {
    if (status !== "authed") return;
    if (newChatLoading) return;
    setNewChatLoading(true);
    try {
      const threadId = await createThread(authFetch, null);
      if (!threadId) {
        setNewChatLoading(false);
        return;
      }
      const now = Date.now();
      addThread({
        id: threadId,
        title: "New Chat",
        createdAt: now,
        lastActiveAt: now,
        projectId: null,
        pinned: false,
        pinnedOrder: null,
        caps: null,
        workspaceId:
          useWorkspaceStore.getState().activeWorkspaceId ?? undefined,
      });
      setActiveContext(null, threadId);
      useChatStore.getState().setActiveThread(threadId);
      navigate(`/chat/${threadId}`);
    } finally {
      setNewChatLoading(false);
    }
  };

  const mainPanelClass = [
    "absolute inset-0 flex h-full flex-col transition-transform duration-200 ease-out",
    sidebarMode === "profile"
      ? "-translate-x-full pointer-events-none"
      : "translate-x-0 pointer-events-auto",
  ].join(" ");

  const profilePanelClass = [
    "absolute inset-0 flex h-full flex-col transition-transform duration-200 ease-out",
    sidebarMode === "profile"
      ? "translate-x-0 pointer-events-auto"
      : "translate-x-full pointer-events-none",
  ].join(" ");

  return (
    <aside
      className={`
        h-full overflow-hidden
        flex flex-col
        bg-[var(--surface-sidebar)] text-[var(--sb-ink)]
        border-r border-black/[0.04] dark:border-white/[0.06]
        transition-all duration-250 cubic-bezier(0.22, 0.61, 0.36, 1)
        ${collapsed ? "w-[72px] min-w-[72px]" : "w-[300px] min-w-[300px]"}
      `}
    >
      {/* Main content area (flex-1 takes remaining space) */}
      <div className="relative flex-1 min-h-0">
        <div
          className={mainPanelClass}
          aria-hidden={sidebarMode === "profile"}
        >
          {/* Top: Home */}
          <div
            className={`
              shrink-0
              ${collapsed ? "py-3 px-0" : "px-4 py-3"}
              bg-[var(--sb-bg)]
            `}
          >
            <div className="flex items-center justify-between">
              {collapsed ? (
                onToggleCollapse && (
                  <button
                    onClick={onToggleCollapse}
                    className="h-11 w-11 mx-auto flex items-center justify-center rounded-lg hover:bg-[var(--sb-soft)] transition-all duration-150 active:scale-[0.97]"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="16" rx="2" />
                      <line x1="9" y1="4" x2="9" y2="20" />
                    </svg>
                  </button>
                )
              ) : (
                <>
                  <Link
                    to="/chat"
                    className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-all duration-200 ease-out active:scale-[0.97] press-scale"
                  >
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 shadow-sm shadow-blue-500/20">
                      <span className="text-white text-xs font-bold">Y</span>
                    </span>
                    <span className="font-semibold tracking-tight text-[14px]">YUA</span>
                  </Link>
                  {onToggleCollapse && (
                    <button
                      onClick={onToggleCollapse}
                      className="flex items-center justify-center h-8 w-8 rounded-md hover:bg-[var(--sb-soft)] transition"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="16" rx="2" />
                        <line x1="9" y1="4" x2="9" y2="20" />
                      </svg>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* New Chat */}
          <div className={`shrink-0 py-3 ${collapsed ? "px-0" : "px-4"}`}>
            <button
              onClick={handleNewChat}
              disabled={status !== "authed"}
              className={`
                w-full rounded-xl transition-all duration-200 ease-out
                active:scale-[0.96] press-scale disabled:opacity-40
                ${collapsed
                  ? "h-10 flex items-center justify-center bg-transparent border-none active:scale-[0.9]"
                  : "bg-white dark:bg-white/[0.06] border border-black/[0.06] dark:border-white/[0.08] px-4 py-2.5 text-[14px] font-medium text-[var(--sb-ink)] hover:bg-black/[0.02] dark:hover:bg-white/[0.08] shadow-sm shadow-black/[0.03]"
                }
              `}
            >
              {collapsed ? "+" : "+ New Chat"}
            </button>
          </div>

          {/* STUDIO */}
          <div className={`shrink-0 ${collapsed ? "pb-4 px-0" : "px-4 pb-4"}`}>
            {!collapsed && (
              <div className="mb-2 text-[12px] font-semibold tracking-[0.18em] text-[var(--sb-ink-2)]">STUDIO</div>
            )}
            <div className="space-y-1">
              <StudioItem icon={<Image size={20} />} label="Photos" onClick={() => {}} collapsed={collapsed} />
              <StudioItem icon={<FileText size={20} />} label="Documents" onClick={() => {}} collapsed={collapsed} />
            </div>
          </div>

          {/* THREAD LIST (scrollable) */}
          {!collapsed ? (
            <div className="sidebar-scroll flex-1 min-h-0 overflow-y-auto overscroll-contain px-3 py-3 space-y-1">
              <div className="h-px bg-[var(--sb-line)] mb-2" />
              <ProjectSection canPromote={canPromote} threads={threads ?? []} />
              <ThreadSection />
            </div>
          ) : (
            <div className="flex-1 min-h-0" />
          )}

          {/* Workspace Footer — inside panel, pinned to bottom */}
          <div className={`shrink-0 ${collapsed ? "py-3 px-0" : "px-3 py-3"} bg-[var(--surface-sidebar)]`}>
            <button
              onClick={() => setSidebarMode("profile")}
              className={`
                rounded-xl border border-[var(--sb-line)]
                bg-white/80 dark:bg-[var(--surface-panel)] hover:bg-[var(--sb-soft)]
                transition-all duration-150 ease-out
                flex items-center w-full
                ${collapsed ? "h-10 w-10 mx-auto justify-center" : "h-14 px-3 py-2 justify-between"}
              `}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gray-700 to-gray-900 dark:from-gray-500 dark:to-gray-700 text-white text-[12px] font-semibold ring-1 ring-black/10 dark:ring-white/10">
                  {(profile?.user?.name ?? "U").charAt(0).toUpperCase()}
                </span>
                {!collapsed && (
                  <div className="flex flex-col leading-tight min-w-0">
                    <span className="text-[13px] font-semibold text-[var(--sb-ink)] truncate">
                      {profile?.user?.name ?? "Account"}
                    </span>
                    <span className="text-[11px] text-[var(--sb-ink-2)]">
                      {({ free: "Free", pro: "Pro", business: "Business", enterprise: "Enterprise" } as Record<string, string>)[profile?.workspace?.plan ?? "free"] ?? "Free"}
                    </span>
                  </div>
                )}
              </div>
              {!collapsed && (
                <ChevronsUpDown size={16} className="shrink-0 text-[var(--sb-ink-2)]" />
              )}
            </button>
          </div>
        </div>

        <div
          className={profilePanelClass}
          aria-hidden={sidebarMode !== "profile"}
        >
          <SidebarProfilePanel onBack={() => setSidebarMode("main")} />
        </div>
      </div>
    </aside>
  );
}

/* =========================
  Studio Item
========================= */
function StudioItem({
  icon,
  label,
  onClick,
  collapsed = false,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
  collapsed?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        rounded-lg transition-all duration-150 ease-out active:scale-[0.94]
        ${
          collapsed
            ? "h-10 w-10 mx-auto flex items-center justify-center hover:bg-[var(--sb-soft)]"
            : "w-full flex items-center gap-3 px-3 py-2 text-[16px] font-semibold text-[var(--sb-ink)] hover:bg-[var(--sb-soft)]"
        }
      `}
    >
      <span className="text-[var(--sb-ink-2)] flex items-center justify-center">
        {icon}
      </span>
      {!collapsed && <span className="truncate">{label}</span>}
    </button>
  );
}
