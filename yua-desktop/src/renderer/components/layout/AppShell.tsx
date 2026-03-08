import React, { useCallback, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { desktop, isDesktop, isMac } from "@/lib/desktop-bridge";
import SettingsModal from "@/components/settings/SettingsModal";
import TitleBar from "@/components/desktop/TitleBar";
import { SidebarProvider, useSidebar } from "@/components/layout/SidebarContext";
import DeepThinkingDrawerContainer from "@/components/chat/DeepThinkingDrawerContainer";
import { useChatStore } from "@/stores/useChatStore";

const EMPTY_MESSAGES: any[] = [];

/* ─────────────────────────────────────────────
   AppShell — desktop layout wrapper
   ───────────────────────────────────────────── */
export default function AppShell({
  children,
  sidebar,
}: {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppShellInner sidebar={sidebar}>{children}</AppShellInner>
    </SidebarProvider>
  );
}

function AppShellInner({
  children,
  sidebar,
}: {
  children: React.ReactNode;
  sidebar?: React.ReactNode;
}) {
  const { isOpen } = useSidebar();
  const { pathname } = useLocation();

  // Extract threadId from route
  const routeThreadId = useMemo(() => {
    const m = pathname.match(/^\/chat\/(\d+)/);
    return m ? Number(m[1]) : null;
  }, [pathname]);

  // Drawer state from message meta
  const routeThreadMessages = useChatStore((s) => {
    if (routeThreadId == null) return EMPTY_MESSAGES;
    return s.messagesByThread?.[routeThreadId] ?? EMPTY_MESSAGES;
  });

  const metaDrawerOpen = useMemo(
    () => routeThreadMessages.some((m: any) => m.meta?.drawerOpen === true),
    [routeThreadMessages]
  );
  const drawerVisible = routeThreadId != null && metaDrawerOpen;

  const activeDrawerMessage = useMemo(() => {
    for (let i = routeThreadMessages.length - 1; i >= 0; i--) {
      const m = routeThreadMessages[i];
      if ((m as any).meta?.drawerOpen === true) return m;
    }
    return null;
  }, [routeThreadMessages]);

  const drawerMessageId = String(activeDrawerMessage?.id ?? "");
  const drawerTraceId = (activeDrawerMessage as any)?.traceId ?? null;
  const drawerMetaProfile =
    (activeDrawerMessage as any)?.meta?.thinking?.thinkingProfile ??
    (activeDrawerMessage as any)?.meta?.thinkingProfile ??
    null;

  const closeDrawer = useCallback(() => {
    if (routeThreadId == null) return;
    const store = useChatStore.getState();
    const scoped = store.messagesByThread[routeThreadId] ?? [];
    scoped.forEach((m: any) => {
      if (m.meta?.drawerOpen) {
        store.patchAssistantMeta(m.id, { drawerOpen: false });
      }
    });
  }, [routeThreadId]);

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-white dark:bg-[#1b1b1b]">
      {/* Title bar (frameless window drag region) */}
      <TitleBar />

      {/* Body: sidebar + main + drawer */}
      <div className="flex flex-1 min-h-0">
        {/* LEFT SIDEBAR */}
        {isOpen && sidebar && (
          <div className="shrink-0 h-full">{sidebar}</div>
        )}

        {/* MAIN CONTENT */}
        <main className="flex flex-1 min-h-0 flex-col overflow-hidden">
          {children}
        </main>

        {/* RIGHT: Deep Thinking Drawer */}
        {drawerVisible && (
          <div
            className="shrink-0 bg-[var(--surface-panel)] text-[var(--text-secondary)] border-l border-[var(--line)]"
            style={{ width: "35vw", minWidth: 380, maxWidth: 420 }}
          >
            <div className="h-full">
              <DeepThinkingDrawerContainer
                variant="desktop"
                open={true}
                onClose={closeDrawer}
                messageId={drawerMessageId}
                traceId={drawerTraceId}
                profileHint={drawerMetaProfile}
              />
            </div>
          </div>
        )}
      </div>

      {/* GLOBAL FLOATING LAYERS */}
      <SettingsModal />
    </div>
  );
}
