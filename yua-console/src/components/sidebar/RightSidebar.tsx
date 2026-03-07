"use client";

import { useSidebar } from "@/hooks/useSidebar";
import GlassPanel from "@/components/ui/GlassPanel";

import AuthPanel from "./AuthPanel";
import KeysPanel from "./KeysPanel";
import UsagePanel from "./UsagePanel";
import ModelSelector from "./ModelSelector";

import SidebarTabs from "./SidebarTabs";  // <-- require 삭제하고 import

export default function RightSidebar() {
  const { open, tab } = useSidebar();

  return (
    <aside
      className={`
        fixed right-0 top-16 
        h-[calc(100vh-64px)] w-[300px]
        bg-white/70 backdrop-blur-xl 
        border-l border-black/10
        shadow-[0_0_25px_rgba(0,0,0,0.06)]
        transition-transform duration-300
        z-40
        ${open ? "translate-x-0" : "translate-x-full"}
      `}
    >
      <GlassPanel className="h-full p-5 rounded-none flex flex-col bg-white/40">

        <div className="mb-4">
          <SidebarTabs />      {/* <-- 이걸로 변경 */}
        </div>

        <div className="mt-2">
          <ModelSelector />
        </div>

        <div className="flex-1 overflow-y-auto mt-4">
          {tab === "auth" && <AuthPanel />}
          {tab === "keys" && <KeysPanel />}
          {tab === "usage" && <UsagePanel />}
        </div>

      </GlassPanel>
    </aside>
  );
}
