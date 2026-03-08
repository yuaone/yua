"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const BILLING_TABS = [
  { href: "/billing", label: "Overview", exact: true },
  { href: "/billing/api", label: "API Credits" },
  { href: "/billing/subscription", label: "Subscription" },
];

export default function BillingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div>
      {/* Billing sub-navigation */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">Billing</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          Manage your subscription plan and API credits.
        </p>

        <div className="flex items-center gap-1 mt-6 border-b border-[var(--line)]">
          {BILLING_TABS.map((tab) => {
            const isActive = tab.exact
              ? pathname === tab.href
              : pathname.startsWith(tab.href);

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`
                  relative px-4 py-2.5 text-sm font-medium transition-colors duration-150
                  ${isActive
                    ? "text-violet-600 dark:text-violet-400"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                  }
                `}
                style={{ textDecoration: "none" }}
              >
                {tab.label}
                {isActive && (
                  <div className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full bg-violet-500" />
                )}
              </Link>
            );
          })}
        </div>
      </div>

      {children}
    </div>
  );
}
