"use client";

import { ChevronsUpDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useBillingGuard } from "@/hooks/useBillingGuard";

type SidebarWorkspaceFooterProps = {
  onClick: () => void;
  collapsed?: boolean;
};

export default function SidebarWorkspaceFooter({
  onClick,
  collapsed = false,
}: SidebarWorkspaceFooterProps) {
  const { profile } = useAuth();
  const { tier } = useBillingGuard();

  const userName = profile?.user?.name ?? "내 계정";
  const userInitial =
    userName && userName.length > 0
      ? userName.trim().charAt(0).toUpperCase()
      : "U";

  // ⚠️ workspace.tier 타입 에러 방지용 안전 처리
  const tierLabel =
    tier === "pro"
      ? "Pro"
      : tier === "business"
        ? "Business"
        : tier === "enterprise"
          ? "Enterprise"
          : "무료 요금제";
  return (
    <button
      onClick={onClick}
 className={`
   h-16 px-3 py-2 max-lg:h-14 max-lg:px-4
   rounded-xl border border-[var(--sb-line)]
   bg-white/80 dark:bg-[var(--surface-panel)] hover:bg-[var(--sb-soft)]
   transition-colors duration-150
   flex items-center w-full
   ${collapsed ? "justify-center" : "justify-between"}
 `}
    >
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 max-lg:h-10 max-lg:w-10 rounded-full bg-gray-800 text-white dark:bg-white dark:text-black text-sm font-semibold flex items-center justify-center">
          {userInitial}
        </div>

  {!collapsed && (
    <div className="flex flex-col leading-tight">
      <div className="text-[14px] font-semibold text-[var(--sb-ink)] max-lg:text-[15px]">
        {userName}
      </div>
      <div className="text-[12px] text-[var(--sb-ink-2)] max-lg:text-[13px]">
        {tierLabel}
      </div>
    </div>
  )}
</div>
 {!collapsed && (
   <ChevronsUpDown size={18} className="text-[var(--sb-ink-2)]" />
 )}
    </button>
  );
}
