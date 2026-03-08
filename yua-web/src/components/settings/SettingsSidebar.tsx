"use client";

import { useSettingsUI } from "@/store/store/useSettingsUI";
import {
  Sliders,
  Bell,
  Database,
  Shield,
  Users,
  CreditCard,
  Brain,
} from "lucide-react";

const ITEMS = [
  {
    id: "personalization",
    label: "개인 맞춤 설정",
    icon: Sliders,
  },
  {
    id: "notifications",
    label: "알림",
    icon: Bell,
  },
  {
    id: "data",
    label: "데이터 제어",
    icon: Database,
  },
  {
    id: "security",
    label: "보안",
    icon: Shield,
  },
  {
    id: "workspace",
    label: "워크스페이스",
    icon: Users,
  },
  {
    id: "billing",
    label: "Billing",
    icon: CreditCard,
  },
  {
    id: "memory",
    label: "메모리",
    icon: Brain,
  },
] as const;

export default function SettingsSidebar() {
  const { tab, setTab } = useSettingsUI();

  return (
    <aside
      className="
        w-64 border-r bg-gray-50 dark:bg-[#171717] dark:border-[var(--line)] px-4 py-6 text-sm flex flex-col
        max-lg:w-full max-lg:border-r-0 max-lg:border-b max-lg:py-3 max-lg:flex-row max-lg:items-center max-lg:gap-3 max-lg:shrink-0
        max-md:px-3
      "
    >
      <div className="mb-5 text-xs font-semibold text-gray-400 dark:text-[var(--text-muted)] max-lg:mb-0 max-lg:shrink-0">
        설정
      </div>

      <nav className="space-y-1 max-lg:space-y-0 max-lg:flex max-lg:gap-1 max-lg:overflow-x-auto max-lg:scrollbar-none max-lg:shrink max-lg:min-w-0">
        {ITEMS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`
                flex w-full items-center gap-2
                rounded-md px-3 py-2
                transition whitespace-nowrap
                max-lg:w-auto max-lg:shrink-0 max-lg:py-1.5 max-lg:px-2.5 max-lg:text-xs
                ${
                  active
                    ? "bg-white shadow-sm font-medium dark:bg-white/10 dark:text-[var(--text-primary)]"
                    : "hover:bg-white/70 text-gray-700 dark:text-[var(--text-secondary)] dark:hover:bg-white/10"
                }
              `}
            >
              <Icon size={16} className="max-md:hidden" />
              {label}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto pt-6 max-lg:hidden">
        <div className="rounded-lg border border-gray-200 bg-white dark:bg-[#1b1b1b] dark:border-[var(--line)] px-3 py-3 text-xs text-gray-600 dark:text-[var(--text-secondary)]">
          <div className="text-[11px] font-semibold text-gray-400 dark:text-[var(--text-muted)]">
            도움말
          </div>
          <div className="mt-2 space-y-2 text-[12px]">
            <a
              href="/policies/privacy"
              className="block text-blue-600 hover:underline dark:text-[#8ab4ff]"
            >
              개인정보처리방침
            </a>
            <a
              href="/policies/terms"
              className="block text-blue-600 hover:underline dark:text-[#8ab4ff]"
            >
              이용약관
            </a>
          </div>
        </div>
      </div>
    </aside>
  );
}
