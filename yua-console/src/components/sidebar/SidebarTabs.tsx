"use client";

import { useSidebar } from "@/hooks/useSidebar";

export default function SidebarTabs() {
  const { toggle, tab } = useSidebar();

  const items: { key: "auth" | "keys" | "usage"; label: string }[] = [
    { key: "auth", label: "Authentication" },
    { key: "keys", label: "API Keys" },
    { key: "usage", label: "Usage" },
  ];

  return (
    <div className="flex flex-col gap-2">
      {items.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => toggle(key)}
          className={` 
            w-full text-left px-3 py-2 rounded-lg text-sm font-medium
            transition 
            bg-white/70 backdrop-blur-xl border border-black/10 shadow-sm
            hover:bg-white/90 hover:shadow
            ${tab === key 
              ? "text-black font-semibold border-black" 
              : "text-black/70"
            }
          `}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
