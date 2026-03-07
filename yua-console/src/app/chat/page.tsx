"use client";

import { useEffect } from "react";
import ChatSidebar from "@/components/chat/ChatSidebar";
import ChatMain from "@/components/chat/ChatMain";
import { useAuth } from "@/contexts/AuthContext";
import { useChatStore } from "@/store/useChatStore";

const LAST_THREAD_KEY = "yua:lastThreadId";

export default function ChatPage() {
  const { status } = useAuth();
  const { loadThreads, currentThreadId, switchThread } = useChatStore();

  useEffect(() => {
    if (status === "authed") {
      loadThreads();
    }
  }, [status, loadThreads]);

  useEffect(() => {
    if (status !== "authed") return;
    if (currentThreadId) return;

    const last = localStorage.getItem(LAST_THREAD_KEY);
    if (last) {
      switchThread(last);
    }
  }, [status, currentThreadId, switchThread]);

  return (
    <div className="w-full h-full flex min-w-0 overflow-x-hidden">
      <ChatSidebar />
      <div className="flex-1 min-w-0">
        <ChatMain />
      </div>
    </div>
  );
}
