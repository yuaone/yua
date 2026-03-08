"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import CreditBadge from "@/components/CreditBadge";
import { MOCK_PLAN, fetchCredits, fetchSubscription, type CreditBalance } from "@/lib/platform-api";
import type { Subscription } from "yua-shared";

/** Map plan_id from backend to display info */
function planDisplayName(planId: string | undefined): string {
  const MAP: Record<string, string> = { free: "Free", premium: "Pro", pro: "Pro", developer: "Developer", business: "Business", team: "Team", enterprise: "Enterprise" };
  return MAP[planId ?? "free"] ?? planId ?? "Free";
}
function planPrice(planId: string | undefined): number {
  const MAP: Record<string, number> = { free: 0, premium: 20, pro: 20, developer: 50, business: 200, team: 30, enterprise: 0 };
  return MAP[planId ?? "free"] ?? 0;
}

export default function BillingOverviewPage() {
  const [credits, setCredits] = useState<CreditBalance | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchCredits().catch(() => ({ balance: 0, total_purchased: 0, total_used: 0 })),
      fetchSubscription().catch(() => null),
    ]).then(([c, s]) => {
      setCredits(c);
      setSubscription(s);
      setLoading(false);
    });
  }, []);

  const creditBalance = credits?.balance ?? 0;
  const monthlyLimit = MOCK_PLAN.monthlyLimit;
  const currentPlanName = planDisplayName(subscription?.plan_id);
  const currentPlanPrice = planPrice(subscription?.plan_id);

  const usedPct = ((monthlyLimit - creditBalance) / monthlyLimit) * 100;
  const remainPct = (creditBalance / monthlyLimit) * 100;

  // SVG circle math
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeOffset = circumference - (remainPct / 100) * circumference;

  return (
    <div className="max-w-5xl">
      {/* Current Plan — Hero Card */}
      <div className="relative rounded-2xl border border-[var(--line)] bg-[var(--surface-main)] p-8 mb-8 overflow-hidden">
        {/* Decorative gradient blur */}
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-indigo-500/8 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-8">
          {/* Left: Plan info */}
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Current Plan</h2>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-500/20">
                {loading ? "..." : currentPlanName}
              </span>
            </div>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              <span className="font-semibold text-[var(--text-primary)]">${currentPlanPrice}</span>/mo &middot; Credit limit <span className="font-semibold text-[var(--text-primary)]">${monthlyLimit}</span>
            </p>

            {/* Credit progress bar */}
            <div className="max-w-md">
              <div className="flex justify-between text-xs text-[var(--text-muted)] mb-2">
                <span>Used: ${(monthlyLimit - creditBalance).toFixed(2)}</span>
                <span>Remaining: ${creditBalance.toFixed(2)}</span>
              </div>
              <div className="h-3 bg-[var(--surface-panel)] rounded-full overflow-hidden border border-[var(--line)]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-700"
                  style={{ width: `${usedPct}%` }}
                />
              </div>
              <p className="text-xs text-[var(--text-muted)] mt-1.5">{usedPct.toFixed(0)}% used</p>
            </div>
          </div>

          {/* Right: Credit ring */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative w-36 h-36">
              <svg className="w-36 h-36 -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r={radius} fill="none" stroke="var(--line)" strokeWidth="8" />
                <defs>
                  <linearGradient id="creditGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#8b5cf6" />
                    <stop offset="100%" stopColor="#6366f1" />
                  </linearGradient>
                </defs>
                <circle
                  cx="60" cy="60" r={radius}
                  fill="none"
                  stroke="url(#creditGrad)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeOffset}
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-[var(--text-primary)]">{remainPct.toFixed(0)}%</span>
                <span className="text-xs text-[var(--text-muted)]">remaining</span>
              </div>
            </div>
            <CreditBadge balance={creditBalance} limit={monthlyLimit} />
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* API Credits Card */}
        <Link
          href="/billing/api"
          className="group rounded-2xl border border-[var(--line)] bg-[var(--surface-main)] p-6
            hover:border-violet-300 dark:hover:border-violet-500/40 hover:shadow-lg hover:shadow-violet-500/10
            transition-all duration-200 hover:-translate-y-0.5"
          style={{ textDecoration: "none" }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-[var(--text-primary)] group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                API Credits
              </h3>
              <p className="text-xs text-[var(--text-muted)]">Top up credits & view transactions</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-2xl font-bold text-[var(--text-primary)]">${creditBalance.toFixed(2)}</span>
            <svg className="w-5 h-5 text-[var(--text-muted)] group-hover:text-violet-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </div>
        </Link>

        {/* Subscription Card */}
        <Link
          href="/billing/subscription"
          className="group rounded-2xl border border-[var(--line)] bg-[var(--surface-main)] p-6
            hover:border-violet-300 dark:hover:border-violet-500/40 hover:shadow-lg hover:shadow-violet-500/10
            transition-all duration-200 hover:-translate-y-0.5"
          style={{ textDecoration: "none" }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-semibold text-[var(--text-primary)] group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                Subscription
              </h3>
              <p className="text-xs text-[var(--text-muted)]">Manage your plan & billing history</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-[var(--text-primary)]">{loading ? "..." : currentPlanName}</span>
              <span className="text-sm text-[var(--text-muted)]">${currentPlanPrice}/mo</span>
            </div>
            <svg className="w-5 h-5 text-[var(--text-muted)] group-hover:text-violet-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </div>
        </Link>
      </div>
    </div>
  );
}
