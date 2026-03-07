"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

interface SidebarItemProps {
  href: string;
  label: string;
}

export default function SidebarItem({ href, label }: SidebarItemProps) {
  const pathname = usePathname();

  // "/" 예외처리, 부분 경로 포함 매칭 가능하게 개선
  const isActive =
    pathname === href ||
    (href !== "/" && pathname.startsWith(href));

  return (
    <Link
      href={href}
      className={clsx(
        "px-2 py-[6px] rounded-md transition text-[14px]",
        "hover:text-black hover:bg-black/5",
        isActive
          ? "text-black font-semibold bg-black/10"
          : "text-black/60"
      )}
    >
      {label}
    </Link>
  );
}
