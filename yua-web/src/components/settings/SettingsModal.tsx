"use client";

import { X } from "lucide-react";
import { useSettingsUI } from "@/store/store/useSettingsUI";
import SettingsSidebar from "./SettingsSidebar";
import Personalization from "./panels/Personalization";
import Notifications from "./panels/Notifications";
import DataPanel from "./panels/Data";
import Security from "./panels/Security";
import WorkspacePanel from "./panels/Workspace";
import BillingPanel from "./panels/BillingPanel";
import MemoryPanel from "./panels/MemoryPanel";

export default function SettingsModal() {
  const { open, tab, closeSettings } = useSettingsUI();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[1px]"
        onClick={closeSettings}
      />

      {/* Panel */}
      <div
        className="
          relative z-10 flex
          h-[82vh] w-[920px] max-lg:w-[95vw] max-lg:h-[90vh] max-md:w-full max-md:h-full max-md:rounded-none max-lg:flex-col
          rounded-2xl bg-white dark:bg-[#1b1b1b] dark:text-[var(--text-primary)]
          shadow-[0_20px_60px_rgba(0,0,0,0.25)]
          overflow-hidden
          animate-[fadeIn_0.15s_ease-out]
        "
      >
        {/* Sidebar */}
        <SettingsSidebar />

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-10 py-8 text-[var(--text-secondary)]">
          {tab === "personalization" && <Personalization />}
          {tab === "notifications" && <Notifications />}
          {tab === "data" && <DataPanel />}
          {tab === "security" && <Security />}
          {tab === "workspace" && <WorkspacePanel />}
          {tab === "billing" && <BillingPanel />}
          {tab === "memory" && <MemoryPanel />}
        </div>

        {/* Close */}
        <button
          onClick={closeSettings}
          aria-label="설정 닫기"
          className="
            absolute right-4 top-4
            rounded-full p-2
            text-gray-500 dark:text-[var(--text-muted)]
            hover:bg-gray-100 hover:text-black
            dark:hover:bg-white/10 dark:hover:text-[var(--text-primary)]
            transition
          "
        >
          <X size={20} />
        </button>
      </div>
    </div>
  );
}
