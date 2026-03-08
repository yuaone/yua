"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/iam/members", label: "직원 관리" },
  { href: "/iam/roles", label: "역할 & 권한" },
];

export default function IAMLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="fade-in">
      {/* Tab navigation */}
      <div
        style={{
          display: "flex",
          gap: 0,
          borderBottom: "1px solid var(--line)",
          marginBottom: 24,
        }}
      >
        {TABS.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(tab.href + "/");
          return (
            <Link
              key={tab.href}
              href={tab.href}
              style={{
                padding: "10px 20px",
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                color: active ? "var(--accent)" : "var(--text-muted)",
                borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
                textDecoration: "none",
                transition: "all 0.15s ease",
              }}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {children}
    </div>
  );
}
