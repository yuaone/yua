import { useMemo, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Menu } from "lucide-react";
import { useAuth } from "@/contexts/DesktopAuthContext";
import { useChatStore } from "@/stores/useChatStore";
import type { ChatMessageWithMeta } from "@/stores/useChatStore";
import { useChatDraft } from "@/stores/useChatDraft";
import { useThreadMessages } from "@/stores/chatSelectors";

import ChatMessageList from "./ChatMessageList";
import ChatInput from "./ChatInput";
import type { ID } from "yua-shared/types/common";
import { useChatMessages } from "@/hooks/useChatMessages";
import { useChatStream } from "@/hooks/useChatStream";
import { useStreamSessionStore } from "@/stores/useStreamSessionStore";

type ChatMainProps = {
  threadId?: number | null;
};

// Stable style object — prevents re-allocation on every render
const SCROLL_CONTAINER_STYLE = {
  overflowAnchor: "none" as const,
  overscrollBehavior: "contain" as const,
};

export default function ChatMain({ threadId: threadIdProp }: ChatMainProps) {
  const params = useParams<{ threadId: string }>();
  const { status, authFetch } = useAuth();
  const { setDraft } = useChatDraft();

  const isGuest = status === "guest";

  // Use prop if provided, otherwise read from route params
  const threadIdNum = threadIdProp ?? (params.threadId ? Number(params.threadId) : null);

  const streaming = useChatStore((s) => s.streaming);
  const streamState = useChatStore((s) => s.streamState);
  const resetStreamState = useChatStore((s) => s.resetStreamState);
  const streamingLockedThreads = useChatStore((s) => s.streamingLockedThreads);
  const hydrateMessages = useChatStore((s) => s.hydrateMessages);
  const setActiveThread = useChatStore((s) => s.setActiveThread);
  const hydrated = useChatStore((s) =>
    threadIdNum != null ? s.hydratedThreads.has(threadIdNum) : true
  );
  const activeThreadId = useChatStore((s) => s.activeThreadId);
  const { loadMessages } = useChatMessages();
  const { sendPrompt } = useChatStream();
  const { draft, clearDraft } = useChatDraft();
  const addUserMessage = useChatStore((s) => s.addUserMessage);

  const messages = useThreadMessages(threadIdNum);
  const [searchOpen, setSearchOpen] = useState(false);

  // Listen for search trigger
  useEffect(() => {
    const h = () => setSearchOpen(true);
    window.addEventListener("chat:search:open", h);
    return () => window.removeEventListener("chat:search:open", h);
  }, []);

  // Snapshot hydrate traceId (last assistant)
  const lastAssistantTraceId = useMemo(() => {
    if (!messages?.length) return null;
    const reversed = [...messages].reverse();
    const lastAssistant = reversed.find((m) => m.role === "assistant");
    return lastAssistant?.traceId ?? null;
  }, [messages]);

  // SSOT: last assistant thinking profile from message meta
  const lastAssistantThinkingProfile = useMemo(() => {
    if (!messages?.length) return null;
    const reversed = [...messages].reverse();
    const lastAssistant = reversed.find((m: any) => m.role === "assistant");
    const meta = (lastAssistant as any)?.meta as any;
    return (
      meta?.thinking?.thinkingProfile ??
      meta?.thinkingProfile ??
      null
    ) as any;
  }, [messages]);

  // Debug logs removed — were causing unnecessary effect overhead during scroll

  const hasThread = typeof threadIdNum === "number";

  const deferredScrollToBottom = useCallback(
    (behavior: "auto" | "smooth" = "auto") => {
      const el = scrollRef.current;
      if (!el) return;

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const maxTop = el.scrollHeight - el.clientHeight;
          el.scrollTo({
            top: maxTop > 0 ? maxTop : 0,
            behavior,
          });
        });
      });
    },
    []
  );

  // Stage assistant center after user submit
  const stageAssistantCenter = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const offset = Math.min(200, el.clientHeight * 0.26);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        el.scrollTo({
          top: Math.max(0, el.scrollHeight - el.clientHeight - offset),
          behavior: "smooth",
        });
      });
    });
  }, []);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const atBottomRef = useRef(true);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  // Drawer animation scroll freeze
  const frozenScrollTopRef = useRef<number | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const freeze = () => {
      frozenScrollTopRef.current = el.scrollTop;
    };

    const unfreeze = () => {
      if (frozenScrollTopRef.current != null) {
        el.scrollTop = frozenScrollTopRef.current;
        frozenScrollTopRef.current = null;
      }
    };

    window.addEventListener("chat:scroll:freeze", freeze);
    window.addEventListener("chat:scroll:unfreeze", unfreeze);

    return () => {
      window.removeEventListener("chat:scroll:freeze", freeze);
      window.removeEventListener("chat:scroll:unfreeze", unfreeze);
    };
  }, []);

  // =========================
  // Scroll Restore (SSOT)
  // =========================
  const scrollKey = useMemo(() => {
    if (threadIdNum == null) return null;
    return `yua:chat:scroll:${threadIdNum}`;
  }, [threadIdNum]);
  const saveRafRef = useRef<number | null>(null);
  const isHydratingRef = useRef(true);
  const didHydrateScrollRef = useRef(false);
  const lastThreadIdRef = useRef<number | null>(null);

  // Thread change detection -> UI gate reset
  useEffect(() => {
    if (lastThreadIdRef.current === threadIdNum) return;
    lastThreadIdRef.current = threadIdNum;

    // SSOT: route(threadId) and store(activeThreadId) must be in sync
    if (threadIdNum != null) {
      setActiveThread(threadIdNum);
    }

    didHydrateScrollRef.current = false;
    isHydratingRef.current = true;
    atBottomRef.current = true;
    setShowScrollBtn(false);

    if (threadIdNum !== null) {
      if (!streamingLockedThreads.has(threadIdNum)) {
        resetStreamState();
      }
    }
  }, [threadIdNum, resetStreamState, setActiveThread, streamingLockedThreads]);

  // Thread entry hydrate guarantee
  useEffect(() => {
    if (threadIdNum == null) return;
    if (hydrated) return;

    let cancelled = false;

    (async () => {
      const msgs = await loadMessages(threadIdNum);
      if (cancelled) return;
      if (msgs !== null) {
        hydrateMessages(threadIdNum, msgs);
        isHydratingRef.current = false;
        return;
      }
      isHydratingRef.current = false;
    })();

    return () => {
      cancelled = true;
    };
  }, [threadIdNum, hydrated, loadMessages, hydrateMessages]);

  /* =========================================================
     Activity Snapshot Hydrate (reload restore)
  ========================================================= */
  useEffect(() => {
    if (!threadIdNum) return;
    if (!hydrated) return;
    if (!lastAssistantTraceId) return;
    if (status !== "authed") return;

    let cancelled = false;

    const restoreThinkingSessionFromMeta = () => {
      const chatStore = useChatStore.getState();
      const sessionStore = useStreamSessionStore.getState();

      if (sessionStore.session.streaming) return;
      if (sessionStore.session.messageId) return;

      const threadId = chatStore.activeThreadId;
      if (!threadId) return;

      const messages: ChatMessageWithMeta[] =
        chatStore.messagesByThread[threadId] ?? [];
      if (!messages.length) return;

      const lastAssistantWithThinking = [...messages]
        .reverse()
        .find((m: any) => {
          if (m.role !== "assistant") return false;
          if (m.finalized !== true) return false;
          if (m.streaming === true) return false;

          const meta: any = m.meta ?? null;
          const profile =
            meta?.thinking?.thinkingProfile ??
            meta?.thinkingProfile ??
            meta?.profile ??
            null;

          const hasReasoning =
            meta?.hasReasoning === true ||
            profile === "DEEP" ||
            (Array.isArray(meta?.thinking?.summaries) &&
              meta.thinking.summaries.length > 0);

          return Boolean(hasReasoning);
        });

      if (!lastAssistantWithThinking) return;

      sessionStore.update({
        messageId: lastAssistantWithThinking.id,
        thinkingProfile:
          (lastAssistantWithThinking as any)?.meta?.thinking
            ?.thinkingProfile ??
          (lastAssistantWithThinking as any)?.meta?.thinkingProfile ??
          "NORMAL",
        streaming: false,
        active: false,
      });
    };

    (async () => {
      try {
        const res = await authFetch(
          `/api/chat/snapshot?traceId=${lastAssistantTraceId}`
        );

        if (!res.ok) {
          const current = useStreamSessionStore.getState().session;
          useStreamSessionStore.setState({
            session: {
              ...current,
              active: false,
              streaming: false,
              thinkingProfile: (lastAssistantThinkingProfile ??
                current.thinkingProfile ??
                "NORMAL") as any,
            },
          });
          useStreamSessionStore.getState()._rehydrateDrawer();
          restoreThinkingSessionFromMeta();
          return;
        }

        const json = await res.json();

        if (cancelled) return;

        if (!json?.snapshot) {
          const current = useStreamSessionStore.getState().session;
          useStreamSessionStore.setState({
            session: {
              ...current,
              active: false,
              streaming: false,
              thinkingProfile: (lastAssistantThinkingProfile ??
                current.thinkingProfile) as any,
            },
          });
          useStreamSessionStore.getState()._rehydrateDrawer();
          restoreThinkingSessionFromMeta();
          return;
        }

        const snap = json.snapshot;
        const snapMessageId =
          json?.messageId != null ? String(json.messageId) : null;

        // SSOT: snapshot -> session hydrate
        useStreamSessionStore.getState().hydrateFromSnapshot(snap);

        if (snapMessageId) {
          useStreamSessionStore.getState().update({
            messageId: snapMessageId,
          });
        }
        useStreamSessionStore.getState()._rehydrateDrawer();

        if (!snapMessageId) {
          restoreThinkingSessionFromMeta();
        }
      } catch (e) {
        console.error("[SNAPSHOT_HYDRATE_FAIL]", e);
        const current = useStreamSessionStore.getState().session;
        useStreamSessionStore.setState({
          session: {
            ...current,
            active: false,
            streaming: false,
            thinkingProfile: (lastAssistantThinkingProfile ??
              current.thinkingProfile) as any,
          },
        });
        restoreThinkingSessionFromMeta();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    threadIdNum,
    hydrated,
    lastAssistantTraceId,
    lastAssistantThinkingProfile,
    status,
  ]);

  /* =========================================================
     USER submit -> force scroll restore (SSOT)
  ========================================================= */
  useEffect(() => {
    const h = () => {
      atBottomRef.current = false;
      stageAssistantCenter();
    };

    window.addEventListener("chat:user:submit", h);
    return () => {
      window.removeEventListener("chat:user:submit", h);
    };
  }, [stageAssistantCenter]);

  // Throttle scroll handler to avoid re-renders on every frame
  const scrollRafRef = useRef<number | null>(null);
  const lastShowScrollBtnRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateAtBottom = useCallback(() => {
    if (scrollRafRef.current) return; // already scheduled
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;
      const el = scrollRef.current;
      if (!el) return;

      const threshold = 120;
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight;

      const atBottom = distance <= threshold;
      atBottomRef.current = atBottom;

      // Only call setState when value actually changes (avoid re-render on every scroll)
      const shouldShow = !atBottom;
      if (lastShowScrollBtnRef.current !== shouldShow) {
        lastShowScrollBtnRef.current = shouldShow;
        setShowScrollBtn(shouldShow);
      }

      // Save scroll position per thread (debounced — sessionStorage.setItem is sync blocking I/O)
      if (scrollKey) {
        const top = el.scrollTop;
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
          try {
            sessionStorage.setItem(
              scrollKey,
              JSON.stringify({ top, atBottom })
            );
          } catch {}
        }, 300);
      }
    });
  }, [scrollKey]);

  const scrollToBottom = useCallback(
    (behavior: "auto" | "smooth") => {
      const el = scrollRef.current;
      if (!el) return;
      if (!atBottomRef.current) return;
      if (streaming) return;
      el.scrollTo({ top: el.scrollHeight, behavior });
    },
    [streaming]
  );

  /* =========================================================
     Hydrate-only scroll (1x, isolated from runtime)
  ========================================================= */
  useLayoutEffect(() => {
    if (!hydrated) return;
    if (didHydrateScrollRef.current) return;
    const el = scrollRef.current;
    if (!el) return;

    didHydrateScrollRef.current = true;
    isHydratingRef.current = false;

    // Restore saved position first
    if (scrollKey) {
      const raw = sessionStorage.getItem(scrollKey);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as {
            top?: number;
            atBottom?: boolean;
          };
          if (parsed?.atBottom) {
            el.scrollTop = Math.max(0, el.scrollHeight - el.clientHeight);
            atBottomRef.current = true;
          } else if (typeof parsed?.top === "number") {
            const maxTop = Math.max(0, el.scrollHeight - el.clientHeight);
            el.scrollTop = Math.min(parsed.top, maxTop);
            const dist =
              el.scrollHeight - el.scrollTop - el.clientHeight;
            atBottomRef.current = dist <= 120;
          }
        } catch {
          deferredScrollToBottom("auto");
        }
        requestAnimationFrame(updateAtBottom);
        return;
      }
    }

    // No saved position -> scroll to bottom (initial entry UX)
    deferredScrollToBottom("auto");
    requestAnimationFrame(updateAtBottom);
  }, [hydrated, scrollKey, deferredScrollToBottom, updateAtBottom]);

  /* =========================================================
     FINAL alignment (streaming end 1x)
  ========================================================= */
  const wasStreamingRef = useRef(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    wasStreamingRef.current = streaming;
  }, [streaming, hydrated]);

  /* =========================
     Empty state
  ========================= */
  const isEmpty = useMemo(
    () => messages.length === 0 && hydrated,
    [messages.length, hydrated]
  );

  const handleQuickPrompt = useCallback(
    (text: string) => setDraft(text),
    [setDraft]
  );

  return (
    <div className="flex h-full min-w-0 overflow-x-hidden flex-col bg-[var(--surface-main)] text-[var(--text-secondary)]">
      {/* ===== Scroll Area ===== */}
      <div
        ref={scrollRef}
        onScroll={updateAtBottom}
        data-chat-scroll="1"
        className="
          chat-scroll
          flex-1 min-h-0 min-w-0
          overflow-y-auto overflow-x-hidden
          bg-[var(--surface-main)]
          pt-[12px]
          pb-[96px]
        "
        style={SCROLL_CONTAINER_STYLE}
      >
        <div
          className={`
            mx-auto
            w-full
            max-w-[var(--chat-max-w)]
            px-4 sm:px-5 md:px-6
            min-w-0 overflow-x-hidden
          `}
        >
          <ChatMessageList messages={messages} />
          {hydrated && <div className="h-1" />}
        </div>
      </div>

      {/* ===== Input Area (flex) ===== */}
      <div className="relative flex-shrink-0 px-4 sm:px-5 md:px-6 lg:px-0">
        {showScrollBtn && (
          <button
            onClick={() => deferredScrollToBottom("smooth")}
            className="
              absolute -top-14 left-1/2 -translate-x-1/2 z-30
              rounded-full bg-white/95 dark:bg-[#2a2a2a]
              px-3 py-1.5 text-xs text-gray-600 dark:text-[var(--text-secondary)]
              shadow-md hover:bg-gray-100 dark:hover:bg-white/15 transition
            "
          >
            Scroll down
          </button>
        )}

        <ChatInput
          threadId={hasThread ? threadIdNum : null}
        />

        <div className="pb-1 text-center text-[12px] text-gray-400 dark:text-[var(--text-muted)] bg-transparent">
          {isGuest
            ? "Log in to save your conversation history."
            : "YUA can make mistakes. Please verify important information."}
        </div>
      </div>
    </div>
  );
}
