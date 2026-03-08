import { useSettingsUI, type SettingsTab } from "@/stores/useSettingsUI";
import {
  Sliders,
  Bell,
  Database,
  Shield,
  Users,
  CreditCard,
  Brain,
  Monitor,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type SidebarItem = {
  id: SettingsTab;
  label: string;
  icon: LucideIcon;
};

const ITEMS: SidebarItem[] = [
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
  {
    id: "desktop",
    label: "데스크톱",
    icon: Monitor,
  },
];

export default function SettingsSidebar() {
  const { tab, setTab } = useSettingsUI();

  return (
    <aside className="w-64 border-r bg-gray-50 dark:bg-[#171717] dark:border-[var(--line)] px-4 py-6 text-sm flex flex-col">
      <div className="mb-5 text-xs font-semibold text-gray-400 dark:text-[var(--text-muted)]">
        설정
      </div>

      <nav className="space-y-1">
        {ITEMS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`
                flex w-full items-center gap-2
                rounded-md px-3 py-2
                transition
                ${
                  active
                    ? "bg-white shadow-sm font-medium dark:bg-white/10 dark:text-[var(--text-primary)]"
                    : "hover:bg-white/70 text-gray-700 dark:text-[var(--text-secondary)] dark:hover:bg-white/10"
                }
              `}
            >
              <Icon size={16} />
              {label}
            </button>
          );
        })}
      </nav>

      <div className="mt-auto pt-6">
        <div className="rounded-lg border border-gray-200 bg-white dark:bg-[#1b1b1b] dark:border-[var(--line)] px-3 py-3 text-xs text-gray-600 dark:text-[var(--text-secondary)]">
          <div className="text-[11px] font-semibold text-gray-400 dark:text-[var(--text-muted)]">
            도움말
          </div>
          <div className="mt-2 space-y-2 text-[12px]">
            <a
              href="https://yuaone.com/policies/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-blue-600 hover:underline dark:text-[#8ab4ff]"
            >
              개인정보처리방침
            </a>
            <a
              href="https://yuaone.com/policies/terms"
              target="_blank"
              rel="noopener noreferrer"
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
