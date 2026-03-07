"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * ✅ 더 이상 AuthedLayout에서 사용하지 않음 (SSOT)
 * - 혹시 다른 화면에서 재사용할 수 있게만 "정리된" 형태로 유지
 */
export default function AppHeader() {
  const pathname = usePathname();

  const label =
    pathname.startsWith("/project/")
      ? "Project"
      : pathname.startsWith("/workspace")
      ? "Workspace"
      : "Chat";

  return (
    <header className="h-12 shrink-0 flex items-center justify-between px-4 border-b border-[var(--line)] bg-white/70 backdrop-blur">
      <Link
        href="/chat"
        className="font-semibold tracking-tight text-[15px] text-[var(--ink)] hover:opacity-90"
      >
        YUA
      </Link>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="w-8" />
    </header>
  );
}