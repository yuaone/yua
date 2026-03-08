"use client";

import { useState, useEffect, useCallback } from "react";
import { fetchUsage, type UsageResponse } from "@/lib/platform-api";

const DATE_RANGES = [
  { label: "7일", days: 7 },
  { label: "14일", days: 14 },
  { label: "30일", days: 30 },
  { label: "90일", days: 90 },
] as const;

const MODEL_COLORS: Record<string, { bar: string; dot: string }> = {
  "yua-normal": { bar: "from-violet-400 to-violet-600", dot: "bg-violet-500" },
  "yua-fast":   { bar: "from-emerald-400 to-emerald-600", dot: "bg-emerald-500" },
  "yua-deep":   { bar: "from-amber-400 to-orange-500", dot: "bg-amber-500" },
  "yua-search": { bar: "from-sky-400 to-blue-600", dot: "bg-sky-500" },
  "yua-basic":  { bar: "from-gray-400 to-gray-600", dot: "bg-gray-500" },
  "yua-pro":    { bar: "from-rose-400 to-pink-600", dot: "bg-rose-500" },
  "yua-spine":  { bar: "from-teal-400 to-cyan-600", dot: "bg-teal-500" },
};

export default function UsagePage() {
  const [selectedRange, setSelectedRange] = useState<(typeof DATE_RANGES)[number]>(DATE_RANGES[2]); // 30일 default
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUsage = useCallback(async (days: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUsage(days);
      setUsage(data);
    } catch (err: any) {
      console.error("[UsagePage] fetch error:", err);
      setError(err?.message ?? "Failed to load usage data");
      setUsage(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsage(selectedRange.days);
  }, [selectedRange, loadUsage]);

  // Derived values
  const totalCost = usage?.total.credits ?? 0;
  const totalCalls = usage?.total.calls ?? 0;
  const daily = usage?.daily ?? [];
  const byModel = usage?.byModel ?? [];
  const maxCalls = daily.length > 0 ? Math.max(...daily.map((d) => d.calls)) : 1;
  const totalModelCost = byModel.reduce((s, m) => s + m.credits, 0) || 1;

  // Format date labels for chart (MM/DD)
  const formatDateLabel = (dateStr: string) => {
    const parts = dateStr.split("-");
    return `${parts[1]}/${parts[2]}`;
  };

  return (
    <div className="max-w-5xl">
      {/* Header + Date Range */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-10">
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)] tracking-tight">사용량</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-1">API 사용량 및 비용 분석</p>
        </div>
        {/* Date range selector */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--surface-panel)] border border-[var(--line)]">
          {DATE_RANGES.map((r) => (
            <button
              key={r.label}
              onClick={() => setSelectedRange(r)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200
                ${selectedRange.label === r.label
                  ? "bg-gradient-to-r from-violet-500 to-indigo-600 text-white shadow-md shadow-violet-500/20"
                  : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-2xl border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-6 mb-8 text-center">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={() => loadUsage(selectedRange.days)}
            className="mt-3 px-4 py-1.5 rounded-lg text-xs font-medium bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors"
          >
            다시 시도
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !usage && (
        <div className="space-y-4 animate-pulse">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 rounded-2xl bg-[var(--surface-panel)] border border-[var(--line)]" />
            ))}
          </div>
          <div className="h-72 rounded-2xl bg-[var(--surface-panel)] border border-[var(--line)]" />
          <div className="h-48 rounded-2xl bg-[var(--surface-panel)] border border-[var(--line)]" />
        </div>
      )}

      {/* Main content — show when we have data (or finished loading with empty) */}
      {(!loading || usage) && !error && (
        <>
          {/* Summary Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <SumCard
              label="총 API 호출"
              value={totalCalls.toLocaleString()}
              sub="회"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              }
              accentClass="from-violet-500 to-indigo-600"
            />
            <SumCard
              label="사용 모델 수"
              value={`${byModel.length}`}
              sub="개"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
                </svg>
              }
              accentClass="from-emerald-400 to-green-600"
            />
            <SumCard
              label="일 평균 호출"
              value={daily.length > 0 ? Math.round(totalCalls / daily.length).toLocaleString() : "0"}
              sub="회"
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              accentClass="from-sky-400 to-blue-600"
            />
            <SumCard
              label="크레딧 사용"
              value={`$${totalCost.toFixed(2)}`}
              sub=""
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              accentClass="from-amber-400 to-orange-500"
            />
          </div>

          {/* Daily Usage Chart — Vertical Bars */}
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-main)] p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">일별 API 호출</h2>
              <span className="text-xs text-[var(--text-muted)]">
                {daily.length > 0 ? `${daily.length}일간 데이터` : "데이터 없음"}
              </span>
            </div>

            {daily.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-sm text-[var(--text-muted)]">
                선택한 기간에 사용 데이터가 없습니다
              </div>
            ) : (
              <div className="flex items-end justify-between gap-3 h-48 px-2">
                {daily.map((d) => {
                  const heightPct = (d.calls / maxCalls) * 100;
                  return (
                    <div key={d.date} className="flex-1 flex flex-col items-center gap-2 group">
                      {/* Tooltip */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 text-center pointer-events-none">
                        <div className="text-xs font-semibold text-[var(--text-primary)]">{d.calls.toLocaleString()}</div>
                        <div className="text-[10px] text-[var(--text-muted)]">${d.credits.toFixed(2)}</div>
                      </div>
                      {/* Bar */}
                      <div className="w-full flex-1 flex items-end">
                        <div
                          className="w-full rounded-t-lg bg-gradient-to-t from-violet-600 to-indigo-400
                            group-hover:from-violet-500 group-hover:to-indigo-300
                            transition-all duration-300 group-hover:shadow-lg group-hover:shadow-violet-500/20
                            min-h-[4px]"
                          style={{ height: `${heightPct}%` }}
                        />
                      </div>
                      {/* Label */}
                      <span className="text-xs text-[var(--text-muted)] font-medium">{formatDateLabel(d.date)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Model Breakdown — Horizontal Bars */}
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-main)] p-6 mb-8">
            <h2 className="text-base font-semibold text-[var(--text-primary)] mb-6">모델별 비용 비중</h2>

            {byModel.length === 0 ? (
              <div className="flex items-center justify-center h-24 text-sm text-[var(--text-muted)]">
                선택한 기간에 사용 데이터가 없습니다
              </div>
            ) : (
              <div className="space-y-5">
                {byModel.sort((a, b) => b.credits - a.credits).map((m) => {
                  const pct = (m.credits / totalModelCost) * 100;
                  const colors = MODEL_COLORS[m.model] ?? { bar: "from-gray-400 to-gray-600", dot: "bg-gray-500" };
                  return (
                    <div key={m.model}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                          <span className={`w-2.5 h-2.5 rounded-full ${colors.dot}`} />
                          <span className="text-sm font-mono font-medium text-[var(--text-primary)]">{m.model}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-xs text-[var(--text-muted)]">{m.calls.toLocaleString()} 호출</span>
                          <span className="text-sm font-semibold text-[var(--text-primary)]">${m.credits.toFixed(2)}</span>
                          <span className="text-xs font-medium text-[var(--text-muted)] w-10 text-right">{pct.toFixed(0)}%</span>
                        </div>
                      </div>
                      <div className="h-2.5 bg-[var(--surface-panel)] rounded-full overflow-hidden border border-[var(--line)]">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${colors.bar} transition-all duration-700`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Usage Table — daily breakdown with per-model detail */}
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-main)] p-6">
            <h2 className="text-base font-semibold text-[var(--text-primary)] mb-6">일별 사용 내역</h2>

            {daily.length === 0 ? (
              <div className="flex items-center justify-center h-24 text-sm text-[var(--text-muted)]">
                선택한 기간에 사용 데이터가 없습니다
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[var(--line)]">
                      <th className="text-left py-3 px-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">날짜</th>
                      <th className="text-right py-3 px-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">호출</th>
                      <th className="text-right py-3 px-3 text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">비용</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...daily].reverse().map((d) => (
                      <tr
                        key={d.date}
                        className="border-b border-[var(--line)] last:border-b-0 hover:bg-[var(--surface-panel)] transition-colors duration-150"
                      >
                        <td className="py-3.5 px-3 text-sm text-[var(--text-secondary)]">{d.date}</td>
                        <td className="py-3.5 px-3 text-sm text-[var(--text-secondary)] text-right tabular-nums">{d.calls.toLocaleString()}</td>
                        <td className="py-3.5 px-3 text-sm font-semibold text-[var(--text-primary)] text-right tabular-nums">${d.credits.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Loading overlay for refetch */}
          {loading && usage && (
            <div className="fixed inset-0 bg-black/5 dark:bg-white/5 flex items-center justify-center z-50 pointer-events-none">
              <div className="px-4 py-2 rounded-xl bg-[var(--surface-main)] border border-[var(--line)] shadow-lg text-sm text-[var(--text-secondary)]">
                데이터 로딩 중...
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SumCard({
  label,
  value,
  sub,
  icon,
  accentClass,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  accentClass: string;
}) {
  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-main)] p-5 hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-white/5 transition-shadow duration-300">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">{label}</p>
        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${accentClass} flex items-center justify-center text-white shadow-md`}>
          {icon}
        </div>
      </div>
      <div className="flex items-baseline gap-1">
        <p className="text-2xl font-bold text-[var(--text-primary)] tabular-nums">{value}</p>
        {sub && <span className="text-sm text-[var(--text-muted)]">{sub}</span>}
      </div>
    </div>
  );
}
