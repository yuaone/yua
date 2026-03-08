"use client";

import { useState, useEffect, useCallback } from "react";
import CreditBadge from "@/components/CreditBadge";
import {
  MOCK_PLAN,
  fetchCredits, fetchTransactions, purchaseCredits,
  type CreditBalance,
} from "@/lib/platform-api";
import type { CreditTransaction } from "yua-shared";

/* ── Credit Packages (Section 6.4) ── */
const CREDIT_PACKAGES = [
  { id: "starter", name: "Starter", price: 10, credits: 10, bonus: null, calls: "~230" },
  { id: "developer", name: "Developer", price: 50, credits: 55, bonus: "+10%", calls: "~1,250" },
  { id: "business", name: "Business", price: 200, credits: 230, bonus: "+15%", calls: "~5,200" },
  { id: "enterprise", name: "Enterprise", price: 1000, credits: 1200, bonus: "+20%", calls: "~27,000" },
] as const;

/** Map CreditTransaction.type to display style */
const TYPE_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  purchase: { label: "Top Up", color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10" },
  usage: { label: "Deduction", color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-500/10" },
  refund: { label: "Refund", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-500/10" },
  bonus: { label: "Bonus", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10" },
};
const DEFAULT_STYLE = { label: "Other", color: "text-gray-600 dark:text-gray-400", bg: "bg-gray-50 dark:bg-gray-500/10" };

export default function BillingApiPage() {
  const [toast, setToast] = useState<string | null>(null);
  const [credits, setCredits] = useState<CreditBalance | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [txLoading, setTxLoading] = useState(true);

  const loadData = useCallback(() => {
    fetchCredits()
      .then(setCredits)
      .catch(() => setCredits({ balance: 0, total_purchased: 0, total_used: 0 }));
    fetchTransactions(1, 20)
      .then((r) => { setTransactions(r.data); setTxLoading(false); })
      .catch(() => { setTransactions([]); setTxLoading(false); });
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const creditBalance = credits?.balance ?? 0;
  const monthlyLimit = MOCK_PLAN.monthlyLimit;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handlePurchase = (pkg: typeof CREDIT_PACKAGES[number]) => {
    // TODO: Integrate Toss Payments widget to get paymentKey + orderId
    // For now, show toast indicating payment system is not yet connected
    showToast(`Toss Payments integration pending ($${pkg.price} — ${pkg.name} package)`);
  };

  return (
    <div className="max-w-5xl">
      {/* Balance Hero */}
      <div className="relative rounded-2xl border border-[var(--line)] bg-[var(--surface-main)] p-8 mb-8 overflow-hidden">
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="flex-1">
            <p className="text-sm text-[var(--text-muted)] mb-1">Current Credit Balance</p>
            <div className="flex items-baseline gap-3">
              <span className="text-5xl font-bold text-[var(--text-primary)]">
                ${creditBalance.toFixed(2)}
              </span>
              <CreditBadge balance={creditBalance} limit={monthlyLimit} />
            </div>
            <p className="text-sm text-[var(--text-secondary)] mt-2">
              Total purchased: <span className="font-semibold">${(credits?.total_purchased ?? 0).toFixed(2)}</span> &middot;
              Total used: <span className="font-semibold">${(credits?.total_used ?? 0).toFixed(2)}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Credit Packages */}
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-main)] p-8 mb-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Top Up Credits</h2>
            <p className="text-xs text-[var(--text-muted)]">Purchase credit packages via Toss Payments</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {CREDIT_PACKAGES.map((pkg) => (
            <div
              key={pkg.id}
              className="group relative rounded-xl border border-[var(--line)] p-5
                hover:border-violet-400 hover:shadow-lg hover:shadow-violet-500/10
                dark:hover:border-violet-500/50
                transition-all duration-200"
            >
              {pkg.bonus && (
                <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gradient-to-r from-amber-400 to-orange-500 text-white whitespace-nowrap">
                  {pkg.bonus}
                </span>
              )}
              <h3 className="text-sm font-semibold text-[var(--text-secondary)] mb-1">{pkg.name}</h3>
              <p className="text-3xl font-bold text-[var(--text-primary)] group-hover:text-violet-500 transition-colors">
                ${pkg.price}
              </p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                ${pkg.credits} credits{pkg.bonus ? ` (${pkg.bonus})` : ""}
              </p>
              <p className="text-xs text-[var(--text-muted)]">
                {pkg.calls} NORMAL calls
              </p>
              <button
                onClick={() => handlePurchase(pkg)}
                className="w-full mt-4 py-2 rounded-lg text-sm font-semibold
                  bg-gradient-to-r from-violet-500 to-indigo-600 text-white
                  hover:shadow-lg hover:shadow-violet-500/25 hover:-translate-y-0.5
                  active:translate-y-0 transition-all duration-200"
              >
                Purchase
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Transaction History */}
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-main)] p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Transaction History</h2>
            <p className="text-xs text-[var(--text-muted)]">Credit top-ups, deductions, and refunds</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--line)]">
                <th className="text-left py-3 px-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Date</th>
                <th className="text-left py-3 px-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Type</th>
                <th className="text-left py-3 px-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Description</th>
                <th className="text-right py-3 px-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Amount</th>
                <th className="text-right py-3 px-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">Balance</th>
              </tr>
            </thead>
            <tbody>
              {txLoading ? (
                <tr><td colSpan={5} className="py-8 text-center text-sm text-[var(--text-muted)]">Loading transactions...</td></tr>
              ) : transactions.length === 0 ? (
                <tr><td colSpan={5} className="py-8 text-center text-sm text-[var(--text-muted)]">No transactions yet</td></tr>
              ) : transactions.map((tx) => {
                const style = TYPE_STYLES[tx.type] ?? DEFAULT_STYLE;
                const isPositive = tx.type === "purchase" || tx.type === "refund" || tx.type === "bonus";
                return (
                  <tr key={tx.id} className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--surface-panel)] transition-colors">
                    <td className="py-3 px-3 text-[var(--text-secondary)] whitespace-nowrap">
                      {new Date(tx.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      <span className="text-xs text-[var(--text-muted)] ml-1">
                        {new Date(tx.created_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${style.color} ${style.bg}`}>
                        {style.label}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-[var(--text-primary)]">{tx.description ?? tx.model ?? "-"}</td>
                    <td className={`py-3 px-3 text-right font-semibold whitespace-nowrap ${isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                      {isPositive ? "+" : "-"}${Math.abs(tx.amount).toFixed(2)}
                    </td>
                    <td className="py-3 px-3 text-right text-[var(--text-secondary)] whitespace-nowrap">
                      -
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
