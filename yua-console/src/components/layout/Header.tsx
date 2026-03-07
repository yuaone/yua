"use client";

import Link from "next/link";
import IconButton from "@/components/ui/IconButton";
import { useSidebar } from "@/hooks/useSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { toggle } = useSidebar();

  const { status, logout } = useAuth();
  const loggedIn = status === "authed";

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  const navItems = [
    { href: "/console", label: "Console" },
    { href: "/chat", label: "Chat" },
  ];

  return (
    <header
      className="
        fixed top-0 left-0 right-0 z-40
        h-16 w-full flex items-center justify-between
        px-10
        bg-white/65 backdrop-blur-xl
        border-b border-black/10
        shadow-[0_4px_20px_rgba(0,0,0,0.04)]
      "
    >
      {/* LEFT: BRAND */}
      <Link href="/" className="flex items-center gap-3">
        <img src="/icons/yua-logo.svg" className="w-7 h-7 opacity-90" />
        <span className="text-[17px] font-semibold text-black tracking-tight">
          YUA ONE
        </span>
      </Link>

      {/* RIGHT */}
      <div className="flex items-center gap-6 text-[14px]">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "transition px-1 pb-[2px]",
                active
                  ? "text-black font-semibold border-b-2 border-black"
                  : "text-black/60 hover:text-black"
              )}
            >
              {item.label}
            </Link>
          );
        })}

        <IconButton
          icon={<img src="/icons/user.svg" className="w-4 h-4 opacity-90" />}
          onClick={toggle}
        />

        {loggedIn ? (
          <button
            onClick={handleLogout}
            className="
              px-3 py-1 text-xs rounded-lg transition
              bg-black text-white hover:bg-black/80
            "
          >
            Logout
          </button>
        ) : (
          <Link
            href="/login"
            className="text-xs text-black/50 hover:text-black/80 transition"
          >
            Login
          </Link>
        )}
      </div>
    </header>
  );
}
