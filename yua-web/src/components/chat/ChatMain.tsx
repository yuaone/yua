"use client";

import { useMemo, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Menu } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useChatStore } from "@/store/useChatStore";
import type { ChatMessageWithMeta } from "@/store/useChatStore";
import { useChatDraft } from "@/store/useChatDraft";
import {
  useThreadMessages,
} from "@/store/chatSelectors";

import ChatInput from "./ChatInput";
import ChatMessageList from "./ChatMessageList";
import { MemoryIndicator } from "./MemoryIndicator";
import QuickPromptBar from "./QuickPromptBar";
import Stack from "./primitives/Stack";
import type { ID } from "yua-shared/types/common";
import { useChatMessages } from "@/hooks/useChatMessages";
import { useStudioContext } from "@/store/useStudioContext";
import { useChatStream } from "@/hooks/useChatStream";
import { useSidebar } from "@/components/layout/SidebarContext";
import { useStreamSessionStore } from "@/store/useStreamSessionStore";
import ChatSearchBar from "./ChatSearchBar";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";

type ChatMainProps = {
  threadId: number | null;
};

export default function ChatMain({ threadId }: ChatMainProps) {
   const { status, authFetch } = useAuth();
  const { openSidebar } = useSidebar();
  const { setDraft } = useChatDraft();
  const { entry, active } = useStudioContext();


  const isGuest = status === "guest";

  const threadIdNum = threadId;

  const streaming = useChatStore((s) => s.streaming);
  const streamState = useChatStore((s) => s.streamState);
  const resetStreamState = useChatStore((s) => s.resetStreamState);
  const streamingLockedThreads = useChatStore((s) => s.streamingLockedThreads);
  const hydrateMessages = useChatStore((s) => s.hydrateMessages);
  const setActiveThread = useChatStore((s) => s.setActiveThread);
  const hydrated = useChatStore((s) => (threadIdNum != null ? s.hydratedThreads.has(threadIdNum) : true));
  const activeThreadId = useChatStore((s) => s.activeThreadId);
  const { loadMessages } = useChatMessages();
  const { sendPrompt } = useChatStream();
  const { draft, clearDraft } = useChatDraft();
  const addUserMessage = useChatStore((s) => s.addUserMessage);

  const messages = useThreadMessages(threadIdNum);
  const [searchOpen, setSearchOpen] = useState(false);

  // Listen for search trigger from ChatPlusMenu
  useEffect(() => {
    const h = () => setSearchOpen(true);
    window.addEventListener("chat:search:open", h);
    return () => window.removeEventListener("chat:search:open", h);
  }, []);

  // 🔥 Snapshot hydrate 기준 traceId (마지막 assistant)
  const lastAssistantTraceId = useMemo(() => {
    if (!messages?.length) return null;
    const reversed = [...messages].reverse();
    const lastAssistant = reversed.find((m) => m.role === "assistant");
    return lastAssistant?.traceId ?? null;
  }, [messages]);
  // ✅ SSOT: snapshot이 없어도 "이 thread의 마지막 assistant가 DEEP이었는지"는 message.meta로 복원 가능해야 함
  const lastAssistantThinkingProfile = useMemo(() => {
    if (!messages?.length) return null;
    const reversed = [...messages].reverse();
    const lastAssistant = reversed.find((m: any) => m.role === "assistant");
    // 🔥 TS: meta가 studio-only union으로 좁혀질 수 있음 → 읽기 SSOT는 any cast로 통일
    const meta = (lastAssistant as any)?.meta as any;
    return (
      meta?.thinking?.thinkingProfile ??
      meta?.thinkingProfile ??
      null
    ) as any;
  }, [messages]);

  useEffect(() => {
    console.log("[CHAT_MAIN_MOUNT]", threadIdNum);
  }, [threadIdNum]);

  useEffect(() => {
    console.log("[SELECTOR_MESSAGES]", {
      threadId: threadIdNum,
      activeThreadId,
      length: messages.length,
    });
  }, [threadIdNum, activeThreadId, messages.length]);


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

  // 🎭 전송 직후 assistant를 중앙 무대로 스테이징
  const stageAssistantCenter = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    // 화면의 22~28% 사이가 가장 자연스러움
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
  usePullToRefresh(scrollRef);
  const atBottomRef = useRef(true);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  // 🔒 Drawer animation 동안 scroll freeze
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



  // ✅ thread 변경 감지 → UI gate 리셋
  useEffect(() => {
    if (lastThreadIdRef.current === threadIdNum) return;
    lastThreadIdRef.current = threadIdNum;
   // 🔒 SSOT: route(threadId)와 store(activeThreadId)는 반드시 동기화  
if (threadIdNum != null) {
  setActiveThread(threadIdNum);
}

    didHydrateScrollRef.current = false;
    isHydratingRef.current = true;
    atBottomRef.current = true;
    setShowScrollBtn(false);
  // 🔒 ready는 "thread 진입 시 1회만" false
  if (threadIdNum !== null) {
    if (!streamingLockedThreads.has(threadIdNum)) {
      resetStreamState();
    }
  }
  }, [threadIdNum, resetStreamState, setActiveThread, streamingLockedThreads]);

  // ✅ thread 진입 시 hydrate 보장
  useEffect(() => {
if (threadIdNum == null) return;

    if (hydrated) return;

    let cancelled = false;

    (async () => {
      const msgs = await loadMessages(threadIdNum);
      if (cancelled) return;
      // ✅ null = 로드 실패/불확실 → 기존 스토어를 절대 덮어쓰지 않음
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
     🔥 Activity Snapshot Hydrate (새로고침 복원)
     - messages hydrate 이후 실행
  ========================================================= */
 useEffect(() => {
   if (!threadIdNum) return;
   if (!hydrated) return;
   if (!lastAssistantTraceId) return;
   if (status !== "authed") return;

    let cancelled = false;

    // 🔥 messageId 복원 (meta 기반)
    // SSOT: snapshot 우선, meta는 snapshot이 없을 때만 fallback
    const restoreThinkingSessionFromMeta = () => {
      const chatStore = useChatStore.getState();
      const sessionStore = useStreamSessionStore.getState();

      // 🚫 스트리밍 중에는 복원 금지
      if (sessionStore.session.streaming) return;
      // 🚫 이미 연결된 messageId가 있으면 복원 금지
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
            (Array.isArray(meta?.thinking?.summaries) && meta.thinking.summaries.length > 0);

          return Boolean(hasReasoning);
        });

      if (!lastAssistantWithThinking) return;

      sessionStore.update({
        messageId: lastAssistantWithThinking.id,
        // SSOT: snapshot.thinkingProfile > meta.thinkingProfile > null
        thinkingProfile:
          (lastAssistantWithThinking as any)?.meta?.thinking?.thinkingProfile ??
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

        // ✅ 404/403/500이면 snapshot hydrate는 스킵하되,
        // message.meta 기반 최소 복원은 반드시 수행
        if (!res.ok) {
          const current = useStreamSessionStore.getState().session;
          useStreamSessionStore.setState({
            session: {
              ...current,
              active: false,
              streaming: false,
              // snapshot이 없더라도 profile은 복원 (DeepDrawer 버튼 gate SSOT)
              thinkingProfile: (lastAssistantThinkingProfile ?? current.thinkingProfile ?? "NORMAL") as any,
            },
          });
          useStreamSessionStore.getState()._rehydrateDrawer();
          restoreThinkingSessionFromMeta();
          return;
        }

        const json = await res.json();

        if (cancelled) return;
        // snapshot이 없더라도 profile 복원은 해야 함
        if (!json?.snapshot) {
          const current = useStreamSessionStore.getState().session;
          useStreamSessionStore.setState({
            session: {
              ...current,
              active: false,
              streaming: false,
              thinkingProfile: (lastAssistantThinkingProfile ?? current.thinkingProfile) as any,
            },
          });
          useStreamSessionStore.getState()._rehydrateDrawer();
          restoreThinkingSessionFromMeta();
          return;
        }

        const current = useStreamSessionStore.getState().session;

        const snap = json.snapshot;
        const snapMessageId =
          json?.messageId != null ? String(json.messageId) : null;

        // 🔒 SSOT: snapshot → session hydrate (adapter 적용)
        useStreamSessionStore.getState().hydrateFromSnapshot(snap);

        // messageId는 hydrate 이후 별도 update로 반영
        if (snapMessageId) {
          useStreamSessionStore.getState().update({
            messageId: snapMessageId,
          });
        }
        useStreamSessionStore.getState()._rehydrateDrawer();
        // ✅ fallback: snapshot은 있는데 messageId가 없으면 meta 기반으로라도 anchor 복원
        if (!snapMessageId) {
          restoreThinkingSessionFromMeta();
        }
      } catch (e) {
        console.error("[SNAPSHOT_HYDRATE_FAIL]", e);
        // ✅ 네트워크/파싱 에러여도 message.meta 기반 최소 복원
        const current = useStreamSessionStore.getState().session;
        useStreamSessionStore.setState({
          session: {
            ...current,
            active: false,
            streaming: false,
            // SSOT: snapshot.thinkingProfile > meta.thinkingProfile > null
            thinkingProfile: (lastAssistantThinkingProfile ?? current.thinkingProfile) as any,
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
   status
 ]);

  
  /* =========================================================
     USER submit → 강제 scroll 복구 (SSOT)
     - 긴 입력 / textarea resize와 무관
     - USER 의도는 항상 bottom
  ========================================================= */
useEffect(() => {
  const h = () => {
    // 🔥 바닥 고정 해제 (assistant 무대 연출용)
    atBottomRef.current = false;

    // 🔥 중앙 스테이징
    stageAssistantCenter();
  };

    window.addEventListener("chat:user:submit", h);
    return () => {
      window.removeEventListener("chat:user:submit", h);
    };
}, [stageAssistantCenter]);

  const updateAtBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const threshold = 120;
    const distance =
      el.scrollHeight - el.scrollTop - el.clientHeight;

    const atBottom = distance <= threshold;
    atBottomRef.current = atBottom;
    setShowScrollBtn(!atBottom);
    // ✅ thread별 스크롤 위치 저장 (새로고침 복원)
    if (scrollKey) {
      const top = el.scrollTop;
      if (saveRafRef.current) cancelAnimationFrame(saveRafRef.current);
      saveRafRef.current = requestAnimationFrame(() => {
        try {
          sessionStorage.setItem(scrollKey, JSON.stringify({ top, atBottom }));
        } catch {}
      });
    }
  }, []);

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
    Document rewrite → re-hydrate
 ========================================================= */
useEffect(() => {
  if (!threadIdNum) return;

  const h = async () => {
   // 🔒 스트리밍 중에는 절대 rehydrate 금지
   if (streaming) return;

   // 🔒 document canvas에서만 허용
   if (!active) return;
   if (entry?.mode !== "document") return;
   if (entry.threadId !== threadIdNum) return;
    const messages = await loadMessages(threadIdNum);
    if (messages) {
      hydrateMessages(threadIdNum, messages);
    }
  };

  window.addEventListener("document:updated", h);
  return () => {
    window.removeEventListener("document:updated", h);
  };
}, [threadIdNum, hydrateMessages, loadMessages, streaming, active, entry]);

  /* =========================================================
     1️⃣ Hydrate 전용 scroll (단 1회, runtime과 완전 분리)
  ========================================================= */

  useLayoutEffect(() => {
    if (!hydrated) return;
    if (didHydrateScrollRef.current) return;
    const el = scrollRef.current;
    if (!el) return;

    didHydrateScrollRef.current = true;
    isHydratingRef.current = false;

    // ✅ 저장된 위치 우선 복원
    if (scrollKey) {
      const raw = sessionStorage.getItem(scrollKey);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as { top?: number; atBottom?: boolean };
          if (parsed?.atBottom) {
            el.scrollTop = Math.max(0, el.scrollHeight - el.clientHeight);
            atBottomRef.current = true;
          } else if (typeof parsed?.top === "number") {
            const maxTop = Math.max(0, el.scrollHeight - el.clientHeight);
            el.scrollTop = Math.min(parsed.top, maxTop);
            const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
            atBottomRef.current = dist <= 120;
          }
        } catch {
          // fallback
          deferredScrollToBottom("auto");
        }
        // 버튼 상태 동기화
        requestAnimationFrame(updateAtBottom);
        return;
      }
    }

    // 저장값이 없으면 기존대로 "바닥" (초기 진입 UX)
    deferredScrollToBottom("auto");
    requestAnimationFrame(updateAtBottom);
  }, [hydrated, scrollKey, deferredScrollToBottom, updateAtBottom]);



/* =========================================================
   3️⃣ FINAL 정렬 (streaming 종료 시 단 1회)
========================================================= */
const wasStreamingRef = useRef(false);

useEffect(() => {
  const el = scrollRef.current;
  if (!el) return;

  wasStreamingRef.current = streaming;
}, [streaming, hydrated]);

  /* =========================
     Empty state 판단
  ========================= */
 const isEmpty = useMemo(
   () => messages.length === 0 && hydrated,
   [messages.length, hydrated]
 );

 /* =========================
     Document Canvas Guard (TS-safe)
  ========================= */
  const shouldShowDocumentCanvas =
    active === true &&
    entry != null &&
    entry.mode === "document" &&
    typeof entry.sectionId === "number";

  const handleQuickPrompt = useCallback(
    (text: string) => setDraft(text),
    [setDraft]
  );

 return (
   <Stack className="flex h-full min-w-0 overflow-x-hidden flex-col bg-[var(--surface-main)] text-[var(--text-secondary)]">
      {/* Mobile Top Bar */}
 <div className="
   fixed top-0 left-0 right-0 z-40
   flex items-center gap-3 px-4 py-3
   h-[56px] max-lg:h-[52px]
   max-lg:py-2
   bg-[var(--surface-sidebar)] border-b border-[var(--line)]
   lg:hidden
 ">
        <button
          onClick={openSidebar}
          className="p-2 rounded-md hover:bg-white/10"
        >
          <Menu size={22} />
        </button>
        <span className="font-semibold text-[var(--text-primary)]">YUA</span>
      </div>
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
          pt-[56px]
          pb-[96px]
          max-md:pb-[120px]
          max-lg:pt-[52px]
          max-lg:pb-[88px]
        "
        style={{
          overflowAnchor: "none",
          scrollbarGutter: "stable",
          overscrollBehavior: "contain",
        }}
      >
        {/* ===== Search Bar (sticky inside scroll) ===== */}
        {searchOpen && (
          <ChatSearchBar
            messages={messages}
            onClose={() => setSearchOpen(false)}
            scrollContainerRef={scrollRef}
          />
        )}

        {!isGuest && hasThread && isEmpty && (
          <div className="bg-white/80 dark:bg-white/5 backdrop-blur">
            <div className="w-full px-3 sm:px-4 md:px-5 lg:mx-auto lg:max-w-[var(--chat-max-w)] lg:px-6">
              <QuickPromptBar onSelect={handleQuickPrompt} />
            </div>
          </div>
        )}

 <div
   className={`
     mx-auto
     w-full
     max-w-[var(--chat-max-w)]
     px-4 sm:px-5 md:px-6
     min-w-0 overflow-x-hidden
     transition-all duration-200
     max-md:[&_.chat-message]:mx-auto
     max-md:[&_.chat-message]:max-w-[92%]
     max-md:[&_.chat-message]:w-full
     max-md:[&_.chat-bubble]:max-w-full
     max-md:[&_.chat-bubble]:w-full
   `}
 >
          <ChatMessageList messages={messages} />
          {hydrated && <div className="h-1" />}
        </div>
      </div>

      {/* ===== Memory Toast (fixed, event-driven) ===== */}
      <div className="fixed bottom-[140px] max-md:bottom-[160px] left-1/2 -translate-x-1/2 z-50 pointer-events-none">
        <div className="pointer-events-auto">
          <MemoryIndicator />
        </div>
      </div>

      {/* ===== Input Area (flex) ===== */}
      <div className="relative flex-shrink-0 px-4 max-md:px-2 sm:px-5 md:px-6 lg:px-0 max-md:pb-[env(safe-area-inset-bottom)]">
          {showScrollBtn && (
            <button
              onClick={() => deferredScrollToBottom("smooth")}
              className="
                absolute -top-14 left-1/2 -translate-x-1/2 z-30
                rounded-full bg-white/80 dark:bg-white/10 backdrop-blur
                px-3 py-1.5 text-xs text-gray-600 dark:text-[var(--text-secondary)]
                shadow-md hover:bg-gray-100 dark:hover:bg-white/15 transition
              "
            >
              ↓ 아래로
            </button>
          )}

   <ChatInput
     threadId={hasThread ? threadIdNum : null}
     disabled={false}
   />

          <div className="pb-[calc(env(safe-area-inset-bottom)+4px)] text-center text-[12px] text-gray-400 dark:text-[var(--text-muted)] bg-transparent">
            {isGuest
              ? "로그인하면 대화 기록이 저장됩니다."
              : "YUA는 실수할 수 있습니다. 중요한 정보는 반드시 확인하세요."}
          </div>
        </div>
    </Stack>
  );
}
