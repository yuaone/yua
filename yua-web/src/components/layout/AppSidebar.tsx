  "use client";

import { useEffect, useState, type ReactNode } from "react";
  import { useRouter, usePathname } from "next/navigation";
import { Image, Home, FileText } from "lucide-react";
  import Link from "next/link";

  import { useAuth } from "@/contexts/AuthContext";
  import { useSidebarStore } from "@/store/useSidebarStore";
  import { useSidebarData } from "@/hooks/useSidebarData";
  import { useStudioContext } from "@/store/useStudioContext";
  import { useChatStore } from "@/store/useChatStore";

  import SidebarProfilePanel from "@/components/sidebar/SidebarProfilePanel";
  import SidebarWorkspaceFooter from "@/components/sidebar/SidebarWorkspaceFooter";

  import { ProjectSection } from "@/components/sidebar/ProjectSection";
  import { ThreadGroup } from "@/components/sidebar/ThreadGroup";
  import WorkspaceThreadList from "@/components/sidebar/WorkspaceThreadList";
  import { useWorkspaceStore } from "@/store/store/useWorkspaceStore";
  import { useSidebar } from "@/components/layout/SidebarContext";
  import { createThread } from "@/lib/api/sidebar.api";


export default function AppSidebar({
  collapsed = false,
  onToggleCollapse,
}: {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const { closeSidebar } = useSidebar();
    const { status, profile, authFetch } = useAuth();
    const workspaceId = profile?.workspace?.id ?? null;
    const role = profile?.role ?? null;
    const canPromote = role === "owner" || role === "admin";

    /** ✅ Sidebar가 thread의 SSOT */
    const [openProjects, setOpenProjects] = useState<Record<string, boolean>>({});
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
    /** ✅ ChatStore에서는 message만 참고 */
    const { messagesByThread } = useChatStore();
    const { loadThreads, loadProjects, loadGroupedThreads } = useSidebarData();
    const { openStudio } = useStudioContext();

  const { createNewThread } = useSidebarData();

    /**
     * ✅ SSOT: URL = 상태
     * - /project/:id  -> activeProjectId=id, activeThreadId=null
     * - /chat         -> activeProjectId=null, activeThreadId=null (General Overview)
     * - /chat/:id     -> activeThreadId=id, activeProjectId=thread.projectId (있으면)
     */
    useEffect(() => {
      if (status !== "authed") return;

      // /chat, / overview routes don't need threads
      if (pathname === "/chat" || pathname === "/") {
        setActiveContext(null, null);
        return;
      }

      // threads hydrate 전에는 thread/project route 판단 금지
      if (!threads || threads.length === 0) {
        return;
      }

      const mProject = pathname.match(/^\/project\/([^/]+)/);
      if (mProject?.[1]) {
        if (loadingProjects) return;

        const pid = String(mProject[1]);
        const exists = projects.some((p) => String(p.id) === pid);
        if (!exists) {
          router.replace("/chat");
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
    }, [
      status,
      pathname,
      threads,
      setActiveContext,
      projects,
      loadingProjects,
      router,
    ]);

  /* =========================
     🔒 최초 1회 Hydration (GPT 스타일)
  ========================= */
  useEffect(() => {
    if (status !== "authed") return;

    const { threads, loadingThreads } = useSidebarStore.getState();

    // 이미 로드됐으면 재요청 금지
    if (threads && threads.length > 0) {
      console.log("[SIDEBAR][HYDRATION] skipped (already hydrated)");
      return;
    }

    // 이미 로딩 중이면 중복 방지
    if (loadingThreads) return;

    console.log("[SIDEBAR][HYDRATION] first load");

    loadProjects();
    loadGroupedThreads();
  }, [status]);

    const goToThread = (threadId: number) => {
      if (!Number.isFinite(threadId)) return;
      const t = threads.find((x) => x.id === threadId);
      if (role !== "owner" && t?.workspaceId && t.workspaceId !== useWorkspaceStore.getState().activeWorkspaceId) {
        useWorkspaceStore.getState().setActiveWorkspaceId(t.workspaceId);
      }
      setActiveContext((t?.projectId ?? null) as any, threadId);
      touchThread(threadId);
      closeSidebar();
      router.push(`/chat/${threadId}` as any);
    };

const [newChatLoading, setNewChatLoading] = useState(false);
const handleNewChat = async () => {
  if (status !== "authed") return;
  if (newChatLoading) return;
  setNewChatLoading(true);
  closeSidebar();
  try {
    const threadId = await createThread(authFetch, null);
    if (!threadId) { setNewChatLoading(false); return; }
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
      workspaceId: useWorkspaceStore.getState().activeWorkspaceId ?? undefined,
    });
    setActiveContext(null, threadId);
    useChatStore.getState().setActiveThread(threadId);
    router.push(`/chat/${threadId}` as any);
  } finally {
    setNewChatLoading(false);
  }
};

    /* =========================
      🔥 STUDIO ENTRY (SAFE)
    ========================= */
    const handleStudio = (
      mode: "image" | "video" | "document"
    ) => {
      if (status !== "authed") return;

      const messages =
        activeThreadId
          ? messagesByThread[Number(activeThreadId)] ?? []
          : [];

      const lastUserMessage = [...messages]
        .reverse()
        .find((m) => m.role === "user");

      openStudio({
        mode,
        input: lastUserMessage?.content ?? "",
        attachments: lastUserMessage?.attachments ?? [],
        threadId: activeThreadId ? Number(activeThreadId) : null,
        sectionId: 0, // 🔥 library is scoped via studio images endpoint
      });

      // ❗ 라우팅은 아직 하지 않음 (A안에서 처리)
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
  h-dvh overflow-hidden
   flex flex-col
   bg-[var(--surface-sidebar)] text-[var(--sb-ink)]
   transition-all duration-200 ease-out
   max-lg:w-full max-lg:min-w-0
   ${collapsed
     ? "w-[72px] min-w-[72px]"
     : "w-[350px] min-w-[350px]"
   }
 `}

      >
        <div className="relative flex-1">
          <div
            className={mainPanelClass}
            aria-hidden={sidebarMode === "profile"}
          >
            {/* Top: Home (SSOT: Header 대신 홈 버튼) */}
            <div
   className={`
  sticky top-0 z-20
   ${collapsed ? "py-3 px-0" : "px-4 py-3"}
   max-lg:py-2 max-lg:px-5
   bg-[var(--sb-bg)] backdrop-blur-md
 `}
            >
              <div className="flex items-center justify-between">

                {/* 🔥 COLLAPSED: 토글 버튼만 */}
                {collapsed ? (
                  onToggleCollapse && (
                    <button
                      onClick={onToggleCollapse}
                      className="h-11 w-11 mx-auto flex items-center justify-center rounded-lg hover:bg-[var(--sb-soft)] transition-all duration-150 active:scale-[0.97]"
                    >
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="3" y="4" width="18" height="16" rx="2" />
                        <line x1="9" y1="4" x2="9" y2="20" />
                      </svg>
                    </button>
                  )
                ) : (
                  <>
                    {/* 🔥 EXPANDED: Home + Collapse */}
                    <Link
                      href="/chat"
                      className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-[var(--sb-soft)] transition-all duration-150 ease-out active:scale-[0.96]"
                    >
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-white dark:bg-zinc-800 border border-[var(--sb-line)] transition-all duration-150 ease-out active:scale-[0.92]">
                        <Home size={16} />
                      </span>
                      <span className="font-semibold tracking-tight text-[15px]">
                        YUA
                      </span>
                    </Link>

                    {onToggleCollapse && (
                      <button
                        onClick={onToggleCollapse}
                        className="hidden lg:flex items-center justify-center h-8 w-8 rounded-md hover:bg-[var(--sb-soft)] transition"
                      >
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
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
            <div className={`py-4 ${collapsed ? "px-0" : "px-4"} max-lg:px-5 max-lg:py-3`}>
              <button
                onClick={handleNewChat}
                disabled={status !== "authed"}
 className={`
   w-full rounded-lg transition-all duration-200 ease-out
   hover:bg-[var(--sb-soft)] transition-all duration-150 ease-out active:scale-[0.95]
   disabled:opacity-40
   ${collapsed
     ? "h-10 flex items-center justify-center bg-transparent border-none transition-all duration-150 ease-out active:scale-[0.9]"
     : "bg-white dark:bg-zinc-800 border border-[var(--sb-line)] px-4 py-2.5 text-[15px] font-semibold text-[var(--sb-ink)] max-lg:text-[16px] max-lg:py-3"
   }
 `}
              >
                {collapsed ? "+" : "+ 새 채팅"}
              </button>
            </div>

            {/* STUDIO */}
            <div 
className={collapsed ? "pb-4 px-0" : "px-4 pb-4 max-lg:px-5 max-lg:pb-3"}
            >
{!collapsed && (
  <div className="mb-2 text-[12px] font-semibold tracking-[0.18em] text-[var(--sb-ink-2)] max-lg:mb-1">
    STUDIO
  </div>
)}

              <div className="space-y-1">
      <StudioItem
        icon={<Image size={20} />}   // 아이콘도 살짝 키워줌
        label="사진보관함"
        onClick={() => handleStudio("image")}
        collapsed={collapsed}
      />
      <StudioItem
        icon={<FileText size={20} />}
        label="문서"
        onClick={() => handleStudio("document")}
        collapsed={collapsed}
      />
              </div>
            </div>

            {/* THREAD LIST */}
            {!collapsed ? (
              <div
                className="
                  sidebar-scroll flex-1 min-h-0 overflow-y-auto overscroll-contain
                  px-3 py-3 space-y-1
                  max-lg:px-4 max-lg:py-2
                "
              >
                <div className="h-px bg-[var(--sb-line)] mb-2" />
                <WorkspaceThreadList canPromote={canPromote} />
              </div>
            ) : (
              <div className="flex-1 min-h-0" />
            )}
            {/* Workspace Footer Trigger */}
            <div 
            className={collapsed ? "py-3 px-0" : "px-4 py-3 bg-[var(--sb-bg)] max-lg:px-5 max-lg:py-2"}
            >
              <SidebarWorkspaceFooter
                onClick={() => setSidebarMode("profile")}
                collapsed={collapsed}
              />
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
   ${collapsed
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
