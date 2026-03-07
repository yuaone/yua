"use client";

import AppSidebar from "@/components/layout/AppSidebar";
import GuestSidebar from "@/components/sidebar/GuestSidebar";
import SettingsModal from "@/components/settings/SettingsModal";
import StudioRoot from "@/components/studio/StudioRoot";
import { useAuth } from "@/contexts/AuthContext";

export default function AppShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status } = useAuth();
  return (
    <div className="flex h-dvh w-full max-w-full overflow-x-hidden bg-white">
      {/* LEFT SIDEBAR */}
      {status === "authed" ? (
        <AppSidebar />
      ) : (
        <div className="hidden lg:block">
          <GuestSidebar width={350} />
        </div>
      )}

      {/* MAIN CONTENT (Chat only) */}
      <main className="flex flex-1 min-h-0 flex-col">
        {children}
      </main>

      {/* GLOBAL FLOATING LAYERS */}
      <SettingsModal />
      <StudioRoot />
    </div>
  );
}
