"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/revenue", label: "Overview" },
  { href: "/revenue/api", label: "API 매출" },
  { href: "/revenue/subscription", label: "구독 매출" },
];

export default function RevenueNav() {
  const pathname = usePathname();

  return (
    <div
      style={{
        display: "flex",
        gap: 0,
        borderBottom: "1px solid var(--line)",
        marginBottom: 24,
      }}
    >
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            style={{
              padding: "10px 20px",
              fontSize: 13,
              fontWeight: active ? 600 : 400,
              color: active ? "var(--accent)" : "var(--text-secondary)",
              borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
              textDecoration: "none",
              transition: "all 0.15s ease",
              marginBottom: -1,
            }}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
