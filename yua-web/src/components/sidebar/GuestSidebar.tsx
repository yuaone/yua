"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { useLoginModal } from "@/store/store/useLoginModal";
import { enableAutoGuest } from "@/lib/sessionFlags";
import { useState } from "react";

type GuestSidebarProps = {
  width?: number;
};

export default function GuestSidebar({ width = 280 }: GuestSidebarProps) {
  const router = useRouter();
  const { signInWithGoogle, ensureGuestSession } = useAuth();
  const { openModal } = useLoginModal();
  const [guestLoading, setGuestLoading] = useState(false);

  return (
    <aside
      className="flex flex-col border-r bg-[var(--surface-sidebar)] text-[var(--text-primary)]"
      style={{ width }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-[var(--line)] font-semibold">
        YUA
      </div>

      {/* CTA */}
      <div className="px-4 py-4 space-y-2">
        <button
          onClick={() =>
            openModal({ title: "로그인하고 계속하세요" })
          }
          className="w-full rounded-lg bg-black text-white dark:bg-white dark:text-black px-3 py-2.5 text-sm font-semibold hover:opacity-90"
        >
          로그인하고 시작
        </button>
        <button
          onClick={async () => {
            if (guestLoading) return;
            setGuestLoading(true);
            enableAutoGuest();
            try {
              await ensureGuestSession();
              router.push("/chat");
            } finally {
              setGuestLoading(false);
            }
          }}
          disabled={guestLoading}
          className="w-full rounded-lg border border-[var(--line)] px-3 py-2.5 text-sm text-[var(--text-secondary)] hover:bg-white/10 transition disabled:opacity-60"
        >
          <span className="inline-flex items-center gap-2">
            {guestLoading && (
              <Loader2 size={14} className="animate-spin" />
            )}
            게스트로 시작
          </span>
        </button>
      </div>

      {/* Intro */}
      <div className="px-4 py-2 text-sm text-[var(--text-secondary)] space-y-2">
        <p>YUA는 AI와 대화하며</p>
        <p>프로젝트와 결정을</p>
        <p>하나의 흐름으로 관리합니다.</p>
      </div>

      {/* Static Nav */}
      <div className="mt-auto border-t border-[var(--line)] px-4 py-3 text-xs text-[var(--text-secondary)]">
        로그인하면 대화 저장 · 히스토리 · 메모리를
        사용할 수 있습니다.
      </div>
    </aside>
  );
}
