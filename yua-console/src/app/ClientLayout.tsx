"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import Header from "@/components/layout/Header";
import LeftSidebar from "@/components/sidebar/LeftSidebar";
import RightSidebar from "@/components/sidebar/RightSidebar";
import ErrorBoundary from "@/components/system/ErrorBoundary";
import { useAuth } from "@/contexts/AuthContext";

const PUBLIC_PATHS = ["/login", "/signup"];

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  /* ----------------------------------------
   * ✅ Hooks — 항상 최상단, 항상 동일
   * -------------------------------------- */
  const { status } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  /* ----------------------------------------
   * 🔐 Auth Redirect Logic
   * -------------------------------------- */
  useEffect(() => {
    if (status === "loading") return;

    const isPublic = PUBLIC_PATHS.includes(pathname);

    if (status !== "authed" && !isPublic) {
      router.replace("/login");
    }
  }, [status, pathname, router]);

  /* ----------------------------------------
   * 🧱 Loading Skeleton (❌ return null 금지)
   * -------------------------------------- */
  if (status === "loading") {
    return (
      <div className="flex flex-col min-h-screen">
        <Header />

        <div className="flex flex-1 items-center justify-center text-black/40">
          Loading…
        </div>
      </div>
    );
  }

  /* ----------------------------------------
   * ✅ Normal Render
   * -------------------------------------- */
  return (
    <ErrorBoundary>
      <div className="flex flex-col min-h-screen">
        <Header />

        <div className="relative flex flex-1 overflow-hidden">
          <LeftSidebar />

          <main
            className="
              flex-1 overflow-y-auto
              px-14 py-12
              ml-[240px]
              w-full
              max-w-[1200px]
            "
          >
            {children}
          </main>

          <RightSidebar />
        </div>
      </div>
    </ErrorBoundary>
  );
}
