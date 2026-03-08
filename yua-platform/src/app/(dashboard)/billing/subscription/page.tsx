"use client";

import { useState, useEffect } from "react";
import { fetchSubscription } from "@/lib/platform-api";
import type { Subscription } from "yua-shared";

/* ── Subscription Plans (Section 6.5) ── */
const PLANS = [
  {
    tier: "free" as const,
    name: "Free",
    price: 0,
    priceYearly: 0,
    features: [
      "30 messages/day",
      "FAST mode only",
      "Basic features",
      "Community support",
    ],
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
      </svg>
    ),
  },
  {
    tier: "pro" as const,
    name: "Pro",
    price: 20,
    priceYearly: 16,
    popular: true,
    features: [
      "Unlimited messages",
      "NORMAL + DEEP + SEARCH",
      "File analysis",
      "Memory system",
      "Priority support",
    ],
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
  },
  {
    tier: "team" as const,
    name: "Team",
    price: 30,
    priceYearly: 25,
    features: [
      "Everything in Pro",
      "RESEARCH mode",
      "Team workspace",
      "Shared projects",
      "Audit logs",
      "Dedicated support",
    ],
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
  },
] as const;

/* ── Feature Comparison ── */
const COMPARISON_FEATURES = [
  { name: "Messages per day", free: "30", pro: "Unlimited", team: "Unlimited" },
  { name: "AI Modes", free: "FAST", pro: "FAST, NORMAL, DEEP, SEARCH", team: "All (incl. RESEARCH)" },
  { name: "File analysis", free: false, pro: true, team: true },
  { name: "Memory system", free: false, pro: true, team: true },
  { name: "Team workspace", free: false, pro: false, team: true },
  { name: "Shared projects", free: false, pro: false, team: true },
  { name: "Webhooks & callbacks", free: false, pro: true, team: true },
  { name: "Audit logs", free: false, pro: false, team: true },
  { name: "Support", free: "Community", pro: "Priority", team: "Dedicated" },
];

/* ── Mock Billing History ── */
const MOCK_BILLING_HISTORY = [
  { id: "inv-001", date: "2026-03-01", plan: "Pro", amount: 20.00, status: "paid" as const },
  { id: "inv-002", date: "2026-02-01", plan: "Pro", amount: 20.00, status: "paid" as const },
  { id: "inv-003", date: "2026-01-01", plan: "Pro", amount: 20.00, status: "paid" as const },
  { id: "inv-004", date: "2025-12-01", plan: "Free", amount: 0, status: "paid" as const },
];

const STATUS_STYLES = {
  paid: { label: "Paid", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
  failed: { label: "Failed", color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-500/10" },
  refunded: { label: "Refunded", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-500/10" },
};

/** Map backend plan_id to the tier used in PLANS array */
function planIdToTier(planId: string | undefined): "free" | "pro" | "team" {
  const MAP: Record<string, "free" | "pro" | "team"> = {
    free: "free", premium: "pro", pro: "pro", developer: "pro",
    business: "team", team: "team", enterprise: "team",
  };
  return MAP[planId ?? "free"] ?? "free";
}

export default function BillingSubscriptionPage() {
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("monthly");
  const [toast, setToast] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [subLoading, setSubLoading] = useState(true);

  useEffect(() => {
    fetchSubscription()
      .then((s) => { setSubscription(s); setSubLoading(false); })
      .catch(() => setSubLoading(false));
  }, []);

  const currentTier = planIdToTier(subscription?.plan_id);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleUpgrade = (tier: string) => {
    // TODO: Integrate Toss Payments widget to get customerKey, then call subscribePlan()
    showToast(`Toss Payments integration pending (${tier} plan upgrade)`);
  };

  const handleDowngrade = (tier: string) => {
    // TODO: call cancelSubscription + subscribePlan with downgrade
    showToast(`Downgrade to ${tier} will take effect at end of billing period`);
  };

  return (
    <div className="max-w-5xl">
      {/* Plan Cards */}
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-main)] p-8 mb-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">Choose Your Plan</h2>
              <p className="text-xs text-[var(--text-muted)]">Upgrade or downgrade at any time</p>
            </div>
          </div>

          {/* Billing interval toggle */}
          <div className="flex items-center gap-1 rounded-lg border border-[var(--line)] p-1">
            <button
              onClick={() => setBillingInterval("monthly")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-150
                ${billingInterval === "monthly"
                  ? "bg-violet-500 text-white shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingInterval("yearly")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-150 flex items-center gap-1.5
                ${billingInterval === "yearly"
                  ? "bg-violet-500 text-white shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
            >
              Yearly
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold
                ${billingInterval === "yearly"
                  ? "bg-white/20 text-white"
                  : "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                }`}>
                Save 20%
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {PLANS.map((plan) => {
            const isCurrent = plan.tier === currentTier;
            const isDowngrade = PLANS.findIndex(p => p.tier === currentTier) > PLANS.findIndex(p => p.tier === plan.tier);
            const displayPrice = billingInterval === "yearly" ? plan.priceYearly : plan.price;

            return (
              <div
                key={plan.tier}
                className={`relative rounded-2xl border p-6 transition-all duration-300
                  ${isCurrent
                    ? "border-violet-400 dark:border-violet-500/60 shadow-xl shadow-violet-500/10"
                    : "border-[var(--line)] hover:border-violet-300 dark:hover:border-violet-500/30 hover:shadow-lg"
                  }`}
              >
                {/* Popular badge */}
                {"popular" in plan && plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-gradient-to-r from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-500/30">
                      Popular
                    </span>
                  </div>
                )}

                {/* Icon */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4
                  ${isCurrent
                    ? "bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-500/20"
                    : "bg-[var(--surface-panel)] text-[var(--text-secondary)] border border-[var(--line)]"
                  }`}>
                  {plan.icon}
                </div>

                <h3 className="text-lg font-bold text-[var(--text-primary)]">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mt-2 mb-5">
                  <span className="text-3xl font-bold text-[var(--text-primary)]">${displayPrice}</span>
                  <span className="text-sm text-[var(--text-muted)]">
                    /{plan.tier === "team" ? "seat/mo" : "mo"}
                  </span>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-[var(--text-secondary)]">
                      <svg className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <button
                  onClick={() => {
                    if (!isCurrent) {
                      if (isDowngrade) handleDowngrade(plan.name);
                      else handleUpgrade(plan.name);
                    }
                  }}
                  disabled={isCurrent}
                  className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
                    ${isCurrent
                      ? "bg-violet-100 dark:bg-violet-500/10 text-violet-400 cursor-default"
                      : isDowngrade
                        ? "border border-[var(--line)] text-[var(--text-secondary)] hover:border-violet-400 hover:text-violet-500"
                        : "bg-gradient-to-r from-violet-500 to-indigo-600 text-white hover:shadow-lg hover:shadow-violet-500/25 hover:-translate-y-0.5 active:translate-y-0"
                    }`}
                >
                  {isCurrent ? "Current Plan" : isDowngrade ? "Downgrade" : "Upgrade"}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Feature Comparison Table */}
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-main)] p-8 mb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Feature Comparison</h2>
            <p className="text-xs text-[var(--text-muted)]">Compare what each plan includes</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--line)]">
                <th className="text-left py-3 px-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Feature</th>
                <th className="text-center py-3 px-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Free</th>
                <th className="text-center py-3 px-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                  <span className="text-violet-500">Pro</span>
                </th>
                <th className="text-center py-3 px-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Team</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_FEATURES.map((feat) => (
                <tr key={feat.name} className="border-b border-[var(--line)] last:border-0">
                  <td className="py-3 px-3 text-[var(--text-primary)] font-medium">{feat.name}</td>
                  {(["free", "pro", "team"] as const).map((tier) => {
                    const val = feat[tier];
                    return (
                      <td key={tier} className="py-3 px-3 text-center">
                        {typeof val === "boolean" ? (
                          val ? (
                            <svg className="w-5 h-5 text-emerald-500 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          ) : (
                            <svg className="w-5 h-5 text-[var(--text-muted)] mx-auto opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          )
                        ) : (
                          <span className="text-[var(--text-secondary)] text-xs">{val}</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Billing History */}
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-main)] p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Billing History</h2>
            <p className="text-xs text-[var(--text-muted)]">Subscription invoices and payments</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--line)]">
                <th className="text-left py-3 px-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Date</th>
                <th className="text-left py-3 px-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Plan</th>
                <th className="text-right py-3 px-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Amount</th>
                <th className="text-center py-3 px-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {MOCK_BILLING_HISTORY.map((inv) => {
                const style = STATUS_STYLES[inv.status];
                return (
                  <tr key={inv.id} className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--surface-panel)] transition-colors">
                    <td className="py-3 px-3 text-[var(--text-secondary)]">
                      {new Date(inv.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="py-3 px-3 text-[var(--text-primary)] font-medium">{inv.plan}</td>
                    <td className="py-3 px-3 text-right text-[var(--text-primary)] font-semibold">
                      {inv.amount > 0 ? `$${inv.amount.toFixed(2)}` : "Free"}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${style.color} ${style.bg}`}>
                        {style.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 yua-toast-slide">
          <div className="flex items-center gap-2.5 px-5 py-3 rounded-2xl bg-gray-900 dark:bg-white/10 dark:backdrop-blur-xl text-white text-sm font-medium shadow-2xl border border-white/10">
            <svg className="w-4 h-4 text-violet-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}
