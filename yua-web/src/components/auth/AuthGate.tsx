"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLoginModal } from "@/store/store/useLoginModal";
import { isAutoGuestDisabled } from "@/lib/sessionFlags";

type AuthGateMode = "chat" | "authed";

type AuthGateProps = {
  mode: AuthGateMode;
  children: ReactNode;
};

function StateCard({
  title,
  body,
  actions,
}: {
  title: string;
  body: string;
  actions?: ReactNode;
}) {
  return (
    <div className="w-full max-w-[620px] rounded-2xl border bg-white px-6 py-7 shadow-sm">
      <h2 className="text-lg font-semibold text-[var(--ink)]">{title}</h2>
      <p className="mt-2 text-sm text-gray-500">{body}</p>
      {actions ? <div className="mt-5">{actions}</div> : null}
    </div>
  );
}

export default function AuthGate({ mode, children }: AuthGateProps) {
  const { state, error, ensureGuestSession } = useAuth();
  const { openModal } = useLoginModal();
  const autoOpenRef = useRef(false);

  useEffect(() => {
    if (state === "authed" || state === "guest") {
      autoOpenRef.current = false;
    }
  }, [state]);

  // 🔥 auto guest (chat 모드 전용)
  useEffect(() => {
    if (mode !== "chat") return;
    if (state !== "guest") return;
    if (isAutoGuestDisabled()) return;
    ensureGuestSession().catch(() => {});
  }, [mode, state, ensureGuestSession]);

  useEffect(() => {
    if (mode !== "chat") return;
    if (state !== "guest") return;
    if (!isAutoGuestDisabled()) return;
    if (!autoOpenRef.current) {
      autoOpenRef.current = true;
      openModal({ title: "로그인하고 계속하세요" });
    }
  }, [mode, state, openModal]);

  // booting 중에는 layout 절대 건드리지 않음
  if (state === "booting") {
    return <>{children}</>;
  }

  // 에러 상태
  if (state === "error") {
    if (!autoOpenRef.current) {
      autoOpenRef.current = true;
      openModal({ title: "로그인하고 계속하세요" });
    }
    return <>{children}</>;
  }

  // 🔥 chat 모드는 무조건 통과
  if (mode === "chat") {
    return <>{children}</>;
  }

  // authed 모드
  if (state === "authed") {
    return <>{children}</>;
  }

  // onboarding_required
  if (state === "onboarding_required") {
    if (!autoOpenRef.current) {
      autoOpenRef.current = true;
      openModal({ title: "로그인하고 계속하세요" });
    }
    return <>{children}</>;
  }

  // guest 상태 (authed 모드 접근 시)
  return (
    <div className="flex h-full w-full items-center justify-center p-8">
      {(() => {
        if (!autoOpenRef.current) {
          autoOpenRef.current = true;
          openModal({ title: "로그인하고 계속하세요" });
        }
        return null;
      })()}
    </div>
  );
}
