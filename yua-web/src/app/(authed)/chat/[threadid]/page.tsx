"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import ChatMain from "@/components/chat/ChatMain";
import { useSidebarStore } from "@/store/useSidebarStore";
import AuthGate from "@/components/auth/AuthGate";

export default function ChatThreadPage({
  params,
}: {
  params: { threadid: string };
}) {
  const { state } = useAuth();
  const router = useRouter();

  // 🔒 숫자 파싱은 memo로 안정화
  const threadId = useMemo(() => {
    const n = Number(params.threadid);
    return Number.isFinite(n) ? n : null;
  }, [params.threadid]);

  const setActiveSidebarThread = useSidebarStore(
    (s) => s.setActiveThread
  );

  /* =========================================================
     1️⃣ 유효하지 않은 threadId는 즉시 리다이렉트
  ========================================================= */
  useEffect(() => {
    if (threadId === null) {
      router.replace("/chat");
    }
  }, [threadId, router]);

  /* =========================================================
     2️⃣ Sidebar activeThread 동기화
  ========================================================= */
  useEffect(() => {
    if (threadId == null) return;
    setActiveSidebarThread(threadId);
  }, [threadId, setActiveSidebarThread]);

  /* =========================================================
     3️⃣ AuthGate 안에서 ChatMain만 렌더
     - layout은 이미 고정되어 있음
     - 여기서는 절대 조건부 wrapper를 두지 않음
  ========================================================= */

  return (
    <AuthGate mode="chat">
      {threadId != null ? (
        <ChatMain threadId={threadId} />
      ) : null}
    </AuthGate>
  );
}