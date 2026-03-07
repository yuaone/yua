// src/components/chat/ChatEntryGuard.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useSidebarStore } from "@/store/useSidebarStore";

export default function ChatEntryGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { status } = useAuth();
  const setActiveThread = useSidebarStore(
    (s) => s.setActiveThread
  );

  useEffect(() => {
    // ✅ guest만 차단
    if (status === "guest") {
      setActiveThread(null);
      router.replace("/");
    }
  }, [status, router, setActiveThread]);

  // ✅ loading / authed 모두 통과
  return <>{children}</>;
}
