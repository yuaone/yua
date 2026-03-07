// app/(authed)/layout.tsx
"use client";

import AppSidebar from "@/components/layout/AppSidebar";
import SettingsModal from "@/components/settings/SettingsModal";
import StudioRoot from "@/components/studio/StudioRoot";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useSidebarData } from "@/hooks/useSidebarData";
import { useAuth } from "@/contexts/AuthContext";
import { SidebarContext } from "@/components/layout/SidebarContext";
import { usePathname } from "next/navigation";
import { ProjectOverview } from "@/components/project/ProjectOverview";
import { useChatStore } from "@/store/useChatStore";
import DeepThinkingDrawerContainer from "@/components/chat/DeepThinkingDrawerContainer";
const EMPTY_MESSAGES: any[] = [];

export default function AuthedLayout({
  children,
}: {
  children: React.ReactNode;
}) {

  const { loadThreads, loadProjects } = useSidebarData();
  const loadThreadsRef = useRef(loadThreads);
  const loadProjectsRef = useRef(loadProjects);

  useEffect(() => {
    loadThreadsRef.current = loadThreads;
    loadProjectsRef.current = loadProjects;
  }, [loadThreads, loadProjects]);
  const { state } = useAuth();
  const pathname = usePathname() ?? "";
  const isDocumentStudioRoute = pathname?.startsWith("/studio/document") ?? false;
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  // ✅ 첫 페인트부터 viewport 확정(지진 제거)
  const [isDesktop, setIsDesktop] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.matchMedia("(min-width: 1024px)").matches;
  });
  const openSidebar = () => setSidebarOpen(true);
  const closeSidebar = () => setSidebarOpen(false);
  const toggleCollapse = () => setSidebarCollapsed((v) => !v);
  const routeThreadId = useMemo(() => {
    const path = typeof pathname === "string" ? pathname : "";
    const m = path.match(/^\/chat\/(\d+)$/);
    if (!m?.[1]) return null;
    const n = Number(m[1]);
    return Number.isFinite(n) ? n : null;
  }, [pathname]);

  const routeThreadMessages = useChatStore((s) => {
    if (routeThreadId == null) return EMPTY_MESSAGES;
    return s.messagesByThread?.[routeThreadId] ?? EMPTY_MESSAGES;
  });

  // ✅ drawer "실제 표시" 조건(SSOT):
  // - /chat/:threadId 라우트에서만 표시
  // - 해당 thread의 assistant meta.drawerOpen=true 인 경우만 표시
  const metaDrawerOpen = useMemo(
    () => routeThreadMessages.some((m) => m.meta?.drawerOpen === true),
    [routeThreadMessages]
  );
  const drawerVisible = routeThreadId != null && metaDrawerOpen;
  const activeDrawerMessage = useMemo(() => {
    for (let i = routeThreadMessages.length - 1; i >= 0; i--) {
      const m = routeThreadMessages[i];
      if (m.meta?.drawerOpen === true) return m;
    }
    return null;
  }, [routeThreadMessages]);

  const drawerMessageId = activeDrawerMessage?.id ?? "";
  const drawerTraceId = (activeDrawerMessage as any)?.traceId ?? null;
  const drawerMetaProfile =
    (activeDrawerMessage as any)?.meta?.thinking?.thinkingProfile ??
    (activeDrawerMessage as any)?.meta?.thinkingProfile ??
    null;
 

  // ✅ viewport 확정은 paint 전에 (모바일 drawer가 데스크탑에 순간 뜨는거 방지)
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 1024px)");
    const apply = () => setIsDesktop(mq.matches);
    apply();
    if (mq.addEventListener) {
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
    // Safari fallback
    // @ts-ignore
    mq.addListener(apply);
    // @ts-ignore
    return () => mq.removeListener(apply);
  }, []);

  useEffect(() => {
    if (state !== "authed") return;
    loadProjectsRef.current();
    loadThreadsRef.current();
  }, [state]);
  // 🔥 viewport 기반 drawer 분기
// (resize listener 불필요: matchMedia change로 충분)

  

  const projectMatch = pathname?.match(/^\/project\/([^/]+)/);
  const projectId = projectMatch?.[1] ?? null;

  const isChatRoute = pathname?.startsWith("/chat") ?? false;
  const closeRouteDrawer = useCallback(() => {
    if (routeThreadId == null) return;
    const store = useChatStore.getState();
    const scoped = store.messagesByThread[routeThreadId] ?? [];
    scoped.forEach((m) => {
      if (m.meta?.drawerOpen) {
        store.patchAssistantMeta(m.id, { drawerOpen: false });
      }
    });
  }, [routeThreadId]);

  return (
    <SidebarContext.Provider value={{ openSidebar, closeSidebar }}>
     <div
        className={[
          // 🔥 body 스크롤 금지(스크롤 컨테이너는 ChatMain만)
  "h-dvh min-h-0 overflow-hidden bg-[var(--app-bg)] text-[var(--text-secondary)]",
   "flex",
        ].join(" ")}
      >

        {/* Desktop Sidebar */}
        {!isDocumentStudioRoute && (
          <aside
            className={`
              hidden lg:block
              border-r border-[var(--line)]
              bg-[var(--sb-bg)] text-[var(--sb-ink)]
              ${sidebarCollapsed ? "w-[72px]" : "w-[350px]"}
            `}
          >
            <AppSidebar
              collapsed={sidebarCollapsed}
              onToggleCollapse={toggleCollapse}
            />
          </aside>
        )}

        {/* Mobile Overlay */}
        {!isDocumentStudioRoute && (
          <div
            className={`fixed inset-0 z-50 bg-black/40 transition-opacity lg:hidden ${
              sidebarOpen ? "opacity-100 visible" : "opacity-0 invisible"
            }`}
            onClick={closeSidebar}
          />
        )}

        {/* Mobile Sidebar */}
        {!isDocumentStudioRoute && (
          <div
            className={`fixed inset-y-0 left-0 z-50
            w-[min(80vw,360px)] md:w-[min(72vw,420px)]
            h-[100svh]
            transform transition-transform duration-300 lg:hidden ${
              sidebarOpen ? "translate-x-0" : "-translate-x-full"
            }`}
             style={{ background: "var(--sb-bg)", color: "var(--sb-ink)" }}
          >
            <AppSidebar />
          </div>
        )}

        {/* Main Area (desktop grid col #2) */}
       {/* Main Area (desktop grid col #2) */}
 <main 
   className="flex-1 flex flex-col min-w-0 min-h-0 h-full overflow-hidden"
 >
          {isDocumentStudioRoute ? (
            <div className="flex-1 min-h-0 min-w-0 overflow-hidden">{children}</div>
          ) : isChatRoute ? (
            // ✅ /chat: ChatMain이 스크롤+인풋 레이아웃을 전담
            // - 여기서 maxWidth로 감싸면 input이 떠버림/사라짐
            <div className="flex-1 min-h-0 min-w-0 overflow-hidden">
               <div className="h-full w-full bg-[var(--surface-main)] text-[var(--text-secondary)]">
                {children}</div>
            </div>
          ) : (
              // Centered layout (login / error / overview)
              <div className="flex h-full items-center justify-center">
                <div className="w-full max-w-[880px] px-4 sm:px-6 lg:px-10">
                  {projectId ? <ProjectOverview projectId={projectId} /> : children}
                </div>
              </div>
        )}
        </main>

 {!isDocumentStudioRoute && isDesktop && drawerVisible && (
   <div
      className="hidden lg:block bg-[var(--surface-panel)] text-[var(--text-secondary)] border-l border-[var(--line)] shadow-[0_0_0_1px_rgba(255,255,255,0.02)]"
     style={{ width: "35vw", minWidth: 380, maxWidth: 420 }}
   >
     <div className="h-full">
       <DeepThinkingDrawerContainer
         variant="desktop"
         open={true}
         onClose={closeRouteDrawer}
         messageId={drawerMessageId}
         traceId={drawerTraceId}
         profileHint={drawerMetaProfile}
       />
     </div>
   </div>
 )}

        {/* ✅ Mobile Drawer (SSOT): overlay only */}
        {!isDocumentStudioRoute && !isDesktop && drawerVisible && (
          <DeepThinkingDrawerContainer
            variant="mobile"
            open={drawerVisible}
            onClose={closeRouteDrawer}
            messageId={drawerMessageId}
            traceId={drawerTraceId}
            profileHint={drawerMetaProfile}
          />
        )}
        <SettingsModal />
        {!isDocumentStudioRoute && <StudioRoot />}
      </div>
      
    </SidebarContext.Provider>
  );
}
