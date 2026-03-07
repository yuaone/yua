"use client";

import { useSidebarStore } from "@/store/useSidebarStore";
import { useAuth } from "@/contexts/AuthContext";
import { useLoginModal } from "@/store/store/useLoginModal";
import { enableAutoGuest } from "@/lib/sessionFlags";
import ChatInput from "@/components/chat/ChatInput";
import { useSafePush } from "@/lib/router/safePush";
import { useCallback, useRef, useState } from "react";
import { useChatStream } from "@/hooks/useChatStream";
import { useChatSender } from "@/hooks/useChatSender";
import { createThread } from "@/lib/api/sidebar.api";
import { useChatStore } from "@/store/useChatStore";
import { useWorkspaceStore } from "@/store/store/useWorkspaceStore";
import { Menu } from "lucide-react";
import { useSidebar } from "@/components/layout/SidebarContext";
import { useChatDraft } from "@/store/useChatDraft";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
export function ChatOverview() {
  const { openSidebar } = useSidebar();
  const push = useSafePush();
  const { activeProjectId, threads, setActiveContext, addThread } = useSidebarStore();
  const { state, ensureGuestSession, authFetch } = useAuth();
  const { openModal } = useLoginModal();
  const { sendPrompt } = useChatStream();
  const { send } = useChatSender(sendPrompt);
  const setActiveThread = useChatStore((s) => s.setActiveThread);
  
  const scrollRef = useRef<HTMLDivElement | null>(null);
  usePullToRefresh(scrollRef);
  const [busy, setBusy] = useState(false);

  const isGuest =
    state === "guest" || state === "guest_booting";

  const preparingSession = state === "guest_booting";

  const recent = threads
    .filter(
      (t) =>
        String(t.projectId ?? "null") ===
        String(activeProjectId ?? "null")
    )
    .slice(0, 5);

  const handleLogin = useCallback(() => {
    openModal({
      title: "로그인하고 계속하세요",
    });
  }, [openModal]);

  const handleStartGuest = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    enableAutoGuest();
    try {
      await ensureGuestSession();
    } finally {
      setBusy(false);
    }
  }, [busy, ensureGuestSession]);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[var(--surface-main)] text-[var(--text-secondary)]">
      {/* Mobile Top Bar */}
      <div className="
   fixed top-0 left-0 right-0 z-40
   flex items-center gap-3 px-4
   pt-[calc(env(safe-area-inset-top)+10px)]
   pb-2
   h-[56px] max-lg:h-[52px]
 bg-[var(--surface-sidebar)] border-b border-[var(--line)]
 lg:hidden
      ">
        <button
          onClick={openSidebar}
          className="p-2 rounded-md hover:bg-white/10"
        >
          <Menu size={22} />
        </button>
        <span className="font-semibold">YUA</span>
      </div>

 <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-4 pt-[56px] max-lg:pt-[52px] pb-14 sm:pb-16" style={{ overscrollBehavior: "contain" }}>
        <div className="px-0 sm:px-6 py-8 sm:py-10">
          <div className="w-full lg:max-w-[var(--chat-max-w)] lg:mx-auto">

        <h1 className="text-[28px] max-md:text-[24px] font-semibold tracking-tight text-[var(--text-primary)] mb-2 text-center">
          무엇을 도와드릴까요?
        </h1>

        <p className="text-[15px] text-[var(--text-muted)] leading-relaxed mb-6 text-center">
          질문, 분석, 문서 작성까지 — YUA가 함께합니다.
        </p>

        {isGuest ? (
          <div className="flex flex-col gap-3">
            <button
              onClick={handleLogin}
              disabled={busy || preparingSession}
              className="rounded-xl bg-black py-3.5 text-sm text-white disabled:opacity-50"
            >
              로그인
            </button>

            <button
              onClick={handleStartGuest}
              disabled={busy || preparingSession}
              className="rounded-xl border border-[var(--line)] py-3.5 text-sm text-[var(--text-secondary)] hover:bg-white/10 disabled:opacity-50"
            >
              {preparingSession
                ? "Preparing session..."
                : "게스트로 시작"}
            </button>

            <p className="text-[12px] text-[var(--text-muted)] text-center">
              로그인을 하면 대화 기록과 워크스페이스가 저장됩니다.
            </p>
          </div>
            ) : (
              <>
                {recent.length > 0 && (
                  <div className="mb-6">
                <div className="text-xs font-semibold text-[var(--text-muted)] mb-2">
                  최근 채팅
                </div>
                <div className="space-y-1">
                  {recent.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setActiveContext(
                          (t.projectId ?? null) as any,
                          t.id
                        );
                        push(`/chat/${t.id}`);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 transition max-md:bg-white max-md:dark:bg-[#1b1b1b] max-md:border max-md:border-[var(--line)] max-md:rounded-xl max-md:px-4 max-md:py-3 max-md:shadow-sm"
                    >
                      {t.title || "새 채팅"}
                    </button>
                  ))}
                </div>
                  </div>
                )}
                <div className="mt-8 mx-auto w-full max-w-[var(--chat-input-max-w)]">
                  <ChatInput
                    threadId={null}
                    onSubmit={async ({ content, attachments }) => {
                      console.log("[OVERVIEW_SUBMIT] before createThread", { contentLength: content.length, attachmentsLength: attachments.length });
                      const threadId = await createThread(
                        authFetch,
                        null
                      );
                      console.log("[OVERVIEW_SUBMIT] after createThread", { threadId });
                      if (!threadId) return;

                      // 1) Add to sidebar
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

                      // 2) ChatStore
                      setActiveThread(threadId);

                      // 3) Sidebar context
                      useSidebarStore.getState().setActiveContext(
                        null,
                        threadId
                      );

    send({
      threadId,
      content,
      attachments,
    });

    push(`/chat/${threadId}`);
                    }}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* overview에서는 sticky input 제거(위 카드형 입력으로 대체) */}
    </div>
  );
}
