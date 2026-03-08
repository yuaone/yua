"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  MOCK_API_KEYS, MOCK_DAILY_USAGE, MOCK_USAGE, MOCK_PLAN,
  fetchCredits, fetchSubscription,
  type CreditBalance,
} from "@/lib/platform-api";
import type { Subscription } from "yua-shared";

/* ── Mock recent activity ── */
const RECENT_ACTIVITY = [
  { id: 1, method: "POST", endpoint: "/v1/chat/completions", model: "yua-normal", status: 200, latency: "320ms", time: "2m ago" },
  { id: 2, method: "POST", endpoint: "/v1/chat/completions", model: "yua-deep", status: 200, latency: "1.2s", time: "5m ago" },
  { id: 3, method: "GET", endpoint: "/v1/models", model: "-", status: 200, latency: "45ms", time: "12m ago" },
  { id: 4, method: "POST", endpoint: "/v1/chat/completions", model: "yua-fast", status: 200, latency: "89ms", time: "18m ago" },
  { id: 5, method: "POST", endpoint: "/v1/embeddings", model: "yua-embed", status: 429, latency: "-", time: "23m ago" },
];

export default function DashboardPage() {
  const [credits, setCredits] = useState<CreditBalance | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  useEffect(() => {
    fetchCredits().then(setCredits).catch(() => setCredits({ balance: 0, total_purchased: 0, total_used: 0 }));
    fetchSubscription().then(setSubscription).catch(() => {});
  }, []);

  const creditBalance = credits?.balance ?? 0;
  const monthlyLimit = MOCK_PLAN.monthlyLimit; // usage API not yet available — keep static limit for now

  const activeKeys = MOCK_API_KEYS.filter((k) => k.status === "active").length;
  const todayCalls = MOCK_DAILY_USAGE[MOCK_DAILY_USAGE.length - 1]?.calls ?? 0;
  const todayCost = MOCK_DAILY_USAGE[MOCK_DAILY_USAGE.length - 1]?.cost ?? 0;
  const totalTokens = MOCK_USAGE.reduce((s, u) => s + u.tokens, 0);

  return (
    <div className="max-w-6xl mx-auto">
      {/* ── Welcome ── */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold mb-2">
          <span
            className="bg-clip-text text-transparent"
            style={{
              backgroundImage: "linear-gradient(135deg, #7c3aed 0%, #a78bfa 50%, #6d28d9 100%)",
            }}
          >
            Welcome, Developer
          </span>
        </h1>
        <p className="text-[var(--text-secondary)] text-base">
          Welcome to the YUA API Dashboard. Here&apos;s your overview for today.
        </p>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        <StatCard
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
          }
          iconColor="text-violet-600 dark:text-violet-400"
          iconBg="bg-violet-100 dark:bg-violet-500/15"
          label="API Calls Today"
          value={todayCalls.toLocaleString()}
          sub="calls"
          trend="+12.5%"
          trendUp
        />
        <StatCard
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          iconColor="text-emerald-600 dark:text-emerald-400"
          iconBg="bg-emerald-100 dark:bg-emerald-500/15"
          label="Remaining Credits"
          value={`$${creditBalance.toFixed(2)}`}
          sub={`/ $${monthlyLimit}`}
        />
        <StatCard
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
            </svg>
          }
          iconColor="text-blue-600 dark:text-blue-400"
          iconBg="bg-blue-100 dark:bg-blue-500/15"
          label="Active API Keys"
          value={String(activeKeys)}
          sub="keys"
        />
        <StatCard
          icon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
            </svg>
          }
          iconColor="text-amber-600 dark:text-amber-400"
          iconBg="bg-amber-100 dark:bg-amber-500/15"
          label="Cost Today"
          value={`$${todayCost.toFixed(2)}`}
          sub="USD"
          trend="-8.3%"
          trendUp={false}
        />
      </div>

      {/* ── Quick Actions + Activity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-2">
          <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4">
            Quick Actions
          </h2>
          <div className="flex flex-col gap-3">
            <QuickAction
              href="/keys"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              }
              iconBg="bg-violet-100 dark:bg-violet-500/15"
              iconColor="text-violet-600 dark:text-violet-400"
              title="Create API Key"
              desc="Generate a new API key"
            />
            <QuickAction
              href="/docs"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                </svg>
              }
              iconBg="bg-blue-100 dark:bg-blue-500/15"
              iconColor="text-blue-600 dark:text-blue-400"
              title="View SDK Docs"
              desc="Node.js, Python SDK guides"
            />
            <QuickAction
              href="/usage"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              }
              iconBg="bg-emerald-100 dark:bg-emerald-500/15"
              iconColor="text-emerald-600 dark:text-emerald-400"
              title="View Usage"
              desc="API call stats by model"
            />
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-3">
          <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4">
            Recent API Calls
          </h2>
          <div
            className="rounded-2xl border border-[var(--line)] overflow-hidden"
            style={{
              background: "var(--surface-main)",
              boxShadow: "0 1px 3px 0 rgba(0,0,0,0.04), 0 1px 2px -1px rgba(0,0,0,0.04)",
            }}
          >
            {RECENT_ACTIVITY.map((a, i) => (
              <div
                key={a.id}
                className={`flex items-center justify-between px-5 py-3.5 ${
                  i < RECENT_ACTIVITY.length - 1 ? "border-b border-[var(--line)]" : ""
                } hover:bg-[var(--surface-panel)] transition-colors duration-150`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-[11px] font-bold tracking-wide ${
                      a.method === "POST"
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400"
                        : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                    }`}
                  >
                    {a.method}
                  </span>
                  <code className="text-sm text-[var(--text-primary)] font-mono truncate">
                    {a.endpoint}
                  </code>
                </div>
                <div className="flex items-center gap-4 shrink-0 ml-4">
                  <span className="text-xs text-[var(--text-muted)] hidden sm:inline">{a.model}</span>
                  <span
                    className={`inline-flex w-2 h-2 rounded-full ${
                      a.status === 200 ? "bg-emerald-500" : "bg-red-500"
                    }`}
                  />
                  <span className="text-xs text-[var(--text-muted)] w-12 text-right font-mono">
                    {a.latency}
                  </span>
                  <span className="text-xs text-[var(--text-muted)] w-14 text-right">
                    {a.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Usage Sparkline Bar ── */}
      <div className="mt-10">
        <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-4">
          Last 7 Days Usage
        </h2>
        <div
          className="rounded-2xl border border-[var(--line)] p-6"
          style={{
            background: "var(--surface-main)",
            boxShadow: "0 1px 3px 0 rgba(0,0,0,0.04), 0 1px 2px -1px rgba(0,0,0,0.04)",
          }}
        >
          <div className="flex items-end gap-3 h-32">
            {MOCK_DAILY_USAGE.map((d, i) => {
              const max = Math.max(...MOCK_DAILY_USAGE.map((x) => x.calls));
              const pct = (d.calls / max) * 100;
              const isLast = i === MOCK_DAILY_USAGE.length - 1;
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-2">
                  <span className="text-xs font-medium text-[var(--text-muted)]">
                    {d.calls.toLocaleString()}
                  </span>
                  <div
                    className="w-full rounded-lg transition-all duration-500"
                    style={{
                      height: `${pct}%`,
                      minHeight: "8px",
                      background: isLast
                        ? "linear-gradient(180deg, #7c3aed 0%, #a78bfa 100%)"
                        : "var(--surface-panel)",
                      border: isLast ? "none" : "1px solid var(--line)",
                    }}
                  />
                  <span className="text-xs text-[var(--text-muted)]">{d.date}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── StatCard ── */
function StatCard({
  icon,
  iconColor,
  iconBg,
  label,
  value,
  sub,
  trend,
  trendUp,
}: {
  icon: React.ReactNode;
  iconColor: string;
  iconBg: string;
  label: string;
  value: string;
  sub: string;
  trend?: string;
  trendUp?: boolean;
}) {
  return (
    <div
      className="rounded-2xl border border-[var(--line)] p-5 relative overflow-hidden group transition-all duration-200 hover:-translate-y-0.5"
      style={{
        background: "var(--surface-main)",
        boxShadow: "0 1px 3px 0 rgba(0,0,0,0.04), 0 1px 2px -1px rgba(0,0,0,0.04)",
      }}
    >
      {/* Subtle glass shimmer on hover */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background: "linear-gradient(135deg, rgba(124,58,237,0.03) 0%, transparent 50%)",
        }}
      />
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg} ${iconColor}`}>
            {icon}
          </div>
          {trend && (
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                trendUp
                  ? "text-emerald-700 bg-emerald-100 dark:text-emerald-400 dark:bg-emerald-500/15"
                  : "text-red-700 bg-red-100 dark:text-red-400 dark:bg-red-500/15"
              }`}
            >
              {trend}
            </span>
          )}
        </div>
        <p className="text-sm text-[var(--text-muted)] mb-1">{label}</p>
        <p className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
          {value}{" "}
          <span className="text-sm font-normal text-[var(--text-muted)]">{sub}</span>
        </p>
      </div>
    </div>
  );
}

/* ── QuickAction ── */
function QuickAction({
  href,
  icon,
  iconBg,
  iconColor,
  title,
  desc,
}: {
  href: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 rounded-2xl border border-[var(--line)] p-4 group transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-200 dark:hover:border-violet-500/20"
      style={{
        background: "var(--surface-main)",
        boxShadow: "0 1px 3px 0 rgba(0,0,0,0.04), 0 1px 2px -1px rgba(0,0,0,0.04)",
      }}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg} ${iconColor}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
          {title}
        </p>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">{desc}</p>
      </div>
      <svg
        className="w-4 h-4 text-[var(--text-muted)] ml-auto shrink-0 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all duration-200"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
      </svg>
    </Link>
  );
}
