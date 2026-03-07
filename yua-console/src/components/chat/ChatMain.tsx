"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import VirtualizedMessages from "./PlanMessages";
import ChatInput from "./ChatInput";
import TimelinePanel from "./TimelinePanel";
import SummaryCard from "./SummaryCard";
import MemoryIndicator from "./MemoryIndicator";

import { useChatStore } from "@/store/useChatStore";
import { useSidebar } from "@/hooks/useSidebar";
import { useChatStream } from "@/hooks/useChatStream";
import { useAuth } from "@/contexts/AuthContext";
import { useMemoryIndicator } from "@/store/useMemoryIndicator";

export default function ChatMain() {
  const { model } = useSidebar();
  const { status, authFetch } = useAuth();
  const { sendPrompt, stop } = useChatStream();

  const {
    // ✅ 추가: setAuthFetch 가져오기
    setAuthFetch,

    messages,
    currentThreadId,
    newThread,
    streaming,
    updateThreadTitle,
    loadMessages,
    addUserMessage,
    hydrateThread,
    threadsLoaded,
    loadThreads,
  } = useChatStore((s) => ({
    setAuthFetch: s.setAuthFetch,

    messages: s.messages,
    currentThreadId: s.currentThreadId,
    newThread: s.newThread,
    streaming: s.streaming,
    updateThreadTitle: s.updateThreadTitle,
    loadMessages: s.loadMessages,
    addUserMessage: s.addUserMessage,
    hydrateThread: s.hydrateThread,
    threadsLoaded: s.threadsLoaded,
    loadThreads: s.loadThreads,
  }));

  const { setPending, setSaved, setFailed } = useMemoryIndicator();

  const [input, setInput] = useState("");
  const lastSavedAssistantRef = useRef<string | null>(null);

  /* ---------- AuthFetch Inject (🔥 제일 중요) ---------- */
  useEffect(() => {
    if (status !== "authed") return;

    // authFetch가 없으면 store도 null로 리셋
    if (!authFetch) {
      setAuthFetch(null);
      return;
    }

    // ✅ 여기서 store에 주입해야 loadThreads/newThread가 살아남
    setAuthFetch(authFetch);
  }, [status, authFetch, setAuthFetch]);

  /* ---------- Bootstrap ---------- */
  useEffect(() => {
    if (status !== "authed" || !authFetch) return;
    // loadThreads()는 store.setAuthFetch 내부에서 자동 호출하게 해놨지만,
    // 혹시를 대비해 1번 더 호출해도 문제 없음.
    loadThreads();
  }, [status, authFetch, loadThreads]);

useEffect(() => {
  if (!currentThreadId) return;

  console.log("[DEBUG][HYDRATE]", {
    currentThreadId,
    messagesLen: messages.length,
    threadsLoaded,
  });
}, [currentThreadId, messages.length, threadsLoaded]);

useEffect(() => {
  if (!threadsLoaded) return;

  if (!currentThreadId) {
    hydrateThread();
  }
}, [threadsLoaded, currentThreadId, hydrateThread]);

  const makeTitle = (t: string) =>
    t.trim().length > 30 ? t.slice(0, 30) + "…" : t || "New Chat";

  const saveMessage = async (
    threadId: number,
    role: "user" | "assistant",
    content: string
  ) => {
    if (!authFetch || !content.trim()) return;

    await authFetch("/api/chat/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({ threadId, role, content, model }),
    });
  };

  const handleSend = async () => {
    // ✅ 여기서 authFetch가 null이면 “아무것도 안 먹힘”이 됨
    if (status !== "authed" || !authFetch || !input.trim() || streaming) return;

    const { threads } = useChatStore.getState();
    let threadId = currentThreadId;

    if (!threadId || !threads.find((t) => t.id === threadId)) {
      threadId = await newThread(makeTitle(input));
    }
    if (!threadId) return;

    const userText = input;
    setInput("");

    addUserMessage(userText);
    await saveMessage(Number(threadId), "user", userText);

    setPending();

    await sendPrompt({
      threadId: Number(threadId),
      content: userText,
    });

    if (!messages.some((m) => m.role === "assistant")) {
      await updateThreadTitle(makeTitle(userText));
    }
  };

  useEffect(() => {
    if (streaming || !currentThreadId || !authFetch) return;

    const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
    if (!lastAssistant?.content.trim()) return;
    if (lastSavedAssistantRef.current === lastAssistant.id) return;

    lastSavedAssistantRef.current = lastAssistant.id;

    (async () => {
      try {
        await saveMessage(Number(currentThreadId), "assistant", lastAssistant.content);
        setSaved();
      } catch {
        setFailed();
      }
    })();
  }, [streaming, messages, currentThreadId, authFetch, setSaved, setFailed]);

  const summaryTarget = useMemo(() => {
    if (streaming) return null;
    return [...messages]
      .reverse()
      .find((m) => m.role === "assistant" && m.content.length > 200)?.content;
  }, [streaming, messages]);

  return (
    <div className="relative flex flex-row flex-1 h-full">
      <MemoryIndicator />

      <div className="flex flex-col flex-1">
        <div className="flex-1 px-4 py-6">
          <VirtualizedMessages messages={messages} streaming={streaming} />

          {summaryTarget && (
            <SummaryCard
              summary={summaryTarget.slice(0, 300) + "…"}
              suggestions={["핵심만 요약해줘", "예시를 들어 설명해줘", "더 깊게 설명해줘"]}
              onSelect={(q) => setInput(q)}
            />
          )}
        </div>

        <div className="border-t py-4">
          <ChatInput
            value={input}
            onChange={setInput}
            onSend={handleSend}
            onStop={stop}
            loading={streaming}
          />
        </div>
      </div>

      <TimelinePanel />
    </div>
  );
}
