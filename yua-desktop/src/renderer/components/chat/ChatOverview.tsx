import { useSidebarStore } from "@/stores/useSidebarStore";
import { useAuth } from "@/contexts/DesktopAuthContext";
import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createThread } from "@/lib/api/sidebar.api";
import { useChatStore } from "@/stores/useChatStore";
import { useWorkspaceStore } from "@/stores/useWorkspaceStore";
import ChatInput from "@/components/chat/ChatInput";

export function ChatOverview() {
  const navigate = useNavigate();
  const {
    activeProjectId,
    threads,
    setActiveContext,
    addThread,
  } = useSidebarStore();
  const { status, authFetch } = useAuth();
  const setActiveThread = useChatStore((s) => s.setActiveThread);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  const isGuest = status === "guest";

  const recent = threads
    .filter(
      (t) =>
        String(t.projectId ?? "null") ===
        String(activeProjectId ?? "null")
    )
    .slice(0, 5);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[var(--surface-main)] text-[var(--text-secondary)]">
      {/* Scrollable content area */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto flex flex-col justify-center px-4"
        style={{ overscrollBehavior: "contain" }}
      >
        <div className="px-0 sm:px-6 py-8 sm:py-10">
          <div className="w-full lg:max-w-[var(--chat-max-w)] lg:mx-auto">
            <h1 className="text-[32px] max-md:text-[26px] font-semibold tracking-[-0.03em] text-[var(--text-primary)] mb-3 text-center leading-tight">
              What can I help you with?
            </h1>

            <p className="text-[15px] text-[var(--text-muted)] leading-relaxed mb-8 text-center max-w-sm mx-auto">
              Questions, analysis, document writing — YUA is here to help.
            </p>

            {isGuest ? (
              <div className="flex flex-col gap-3">
                <p className="text-[12px] text-[var(--text-muted)] text-center">
                  Log in to save your conversations and workspaces.
                </p>
              </div>
            ) : (
              <>
                {recent.length > 0 && (
                  <div className="mb-6">
                    <div className="text-[11px] font-semibold text-[var(--text-muted)] mb-3 tracking-wide uppercase">
                      Recent chats
                    </div>
                    <div className="space-y-0.5">
                      {recent.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => {
                            setActiveContext(
                              (t.projectId ?? null) as any,
                              t.id
                            );
                            navigate(`/chat/${t.id}`);
                          }}
                          className="w-full text-left px-3 py-2.5 rounded-xl text-[14px] text-[var(--text-secondary)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-all duration-150 press-scale truncate"
                        >
                          {t.title || "New Chat"}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bottom input — always visible, like ChatGPT/Claude home */}
      <div className="shrink-0 px-6 pb-4 pt-2">
        <div className="mx-auto w-full max-w-[680px]">
          <ChatInput threadId={null} />
        </div>
        <p className="text-center text-[11px] text-[var(--text-muted)] mt-2">
          YUA can make mistakes. Please verify important information.
        </p>
      </div>
    </div>
  );
}
