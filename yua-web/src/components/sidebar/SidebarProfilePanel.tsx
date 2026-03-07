"use client";

import {
  ArrowLeft,
  ArrowUpCircle,
  Building2,
  LogOut,
  Settings,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useSettingsUI } from "@/store/store/useSettingsUI";
import { useSidebarStore } from "@/store/useSidebarStore";
import { useChatStore } from "@/store/useChatStore";
import { useWorkspaceStore } from "@/store/store/useWorkspaceStore";
import { disableAutoGuest } from "@/lib/sessionFlags";

type SidebarProfilePanelProps = {
  onBack: () => void;
};

export default function SidebarProfilePanel({
  onBack,
}: SidebarProfilePanelProps) {
  const { profile, signOut } = useAuth();
  const router = useRouter();
  const { openSettings } = useSettingsUI();
  const resetSidebar = useSidebarStore((s) => s.reset);
  const resetChat = useChatStore((s) => s.reset);
  const setActiveWorkspaceId = useWorkspaceStore(
    (s) => s.setActiveWorkspaceId
  );

  const name = profile?.user?.name ?? "내 계정";
  const email = profile?.user?.email ?? "";

  // Workspace admin page: only visible for Business+ plans
  // Owner sees it for their own workspace; invited admin/member sees it too
  const plan = profile?.workspace?.plan ?? "free";
  const wsRole = profile?.role ?? "member";
  const isBizPlus = plan === "business" || plan === "enterprise";
  const showWorkspaceAdmin = isBizPlus && (wsRole === "owner" || wsRole === "admin" || wsRole === "member");

  const userInitial =
    name && name.length > 0
      ? name.trim().charAt(0).toUpperCase()
      : "U";

  const handleLogout = async () => {
    disableAutoGuest();
    resetChat();
    resetSidebar();
    setActiveWorkspaceId(null);
    await signOut();
    router.replace("/chat?login=1");
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between h-14 px-4 max-lg:h-12 max-lg:px-5 border-b border-[var(--sb-line)]">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[15px] font-semibold text-[var(--sb-ink)]"
        >
          <ArrowLeft size={16} />
          계정
        </button>

        <button
          onClick={onBack}
          className="text-[var(--sb-ink-2)] hover:text-[var(--sb-ink)]"
          aria-label="닫기"
        >
          <X size={18} />
        </button>
      </div>

      {/* Account Info */}
      <div className="px-4 py-4 max-lg:px-5 max-lg:py-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 max-lg:h-10 max-lg:w-10 rounded-full bg-gray-800 text-white text-sm font-semibold flex items-center justify-center">
            {userInitial}
          </div>

          <div className="min-w-0">
            <div className="text-[15px] font-semibold text-[var(--sb-ink)] max-lg:text-[16px]">
              {name}
            </div>
            <div className="text-[13px] text-[var(--sb-ink-2)] truncate max-lg:text-[14px]">
              {email}
            </div>
          </div>
        </div>
      </div>

      <div className="h-px bg-[var(--sb-line)]" />

      {/* Workspace + Upgrade */}
      <div className="px-2 py-2 space-y-1 max-lg:px-4">
        {/* Workspace admin: Business+ owner or invited admin/member only */}
        {showWorkspaceAdmin && (
          <button
            onClick={() => {
              router.push("/workspace");
              onBack();
            }}
            className="flex items-center gap-3 h-11 w-full rounded-lg px-3 text-left text-[14px] max-lg:text-[15px] hover:bg-[var(--sb-soft)] transition-colors duration-150"
          >
            <Building2 size={16} className="text-[var(--sb-ink-2)]" />
            워크스페이스 관리
          </button>
        )}

        <button
          onClick={() => {
            router.push("/upgrade?returnTo=/workspace");
            onBack();
          }}
          className="flex items-center gap-3 h-11 w-full rounded-lg px-3 text-left text-[14px] max-lg:text-[15px] hover:bg-[var(--sb-soft)] transition-colors duration-150"
        >
          <ArrowUpCircle size={16} className="text-[var(--sb-ink-2)]" />
          업그레이드
        </button>
      </div>

      <div className="h-px bg-[var(--sb-line)]" />

      {/* Settings */}
      <div className="px-2 py-2 max-lg:px-4">
        <button
          onClick={() => {
            openSettings();
            onBack();
          }}
          className="flex items-center gap-3 h-11 w-full rounded-lg px-3 text-left text-[14px] max-lg:text-[15px] hover:bg-[var(--sb-soft)] transition-colors duration-150"
        >
          <Settings size={16} className="text-[var(--sb-ink-2)]" />
          개인 맞춤 설정
        </button>
      </div>

      {/* Logout */}
      <div className="mt-auto pt-4 border-t border-[var(--sb-line)] px-2 max-lg:px-4">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 h-11 w-full rounded-lg px-3 text-left text-[14px] max-lg:text-[15px] text-red-600 hover:bg-[var(--sb-soft)] transition-colors duration-150"
        >
          <LogOut size={16} />
          로그아웃
        </button>
      </div>
    </div>
  );
}
