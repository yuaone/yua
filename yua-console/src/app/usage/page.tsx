// 📂 src/app/usage/page.tsx
"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

type UsageLog = {
  model: string;
  tokens: number;
  created_at: string;
};

type DailyUsage = {
  day: string;
  total_tokens: number;
};

type MonthlyUsage = {
  month: string;
  total_tokens: number;
};

type UsageResponse = {
  logs: UsageLog[];
  daily: DailyUsage[];
  monthly: MonthlyUsage[];
};

export default function UsagePage() {
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [daily, setDaily] = useState<DailyUsage[]>([]);
  const [monthly, setMonthly] = useState<MonthlyUsage[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadUsage() {
    try {
      const res = await apiGet<UsageResponse>("/api/usage/list");

      if (!res.ok || !res.data) {
        throw new Error("load usage failed");
      }

      // ✅ TypeScript가 확신할 수 있도록 data를 고정
      const data = res.data;

      setLogs(data.logs ?? []);
      setDaily(data.daily ?? []);
      setMonthly(data.monthly ?? []);
    } catch (err) {
      console.error(err);
      alert("사용량 정보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsage();
  }, []);

  return (
    <div className="p-10 text-black">
      <h1 className="text-3xl font-bold mb-4">Usage</h1>
      <p className="text-black/60 mb-8">
        YUA ONE API 사용 내역입니다. 일일 / 월간 / 전체 사용량을 확인할 수 있습니다.
      </p>

      {loading ? (
        <p className="animate-pulse text-black/50">Loading usage...</p>
      ) : (
        <>
          {/* DAILY CARD */}
          <section className="mb-10 bg-white/70 backdrop-blur-xl p-6 rounded-xl shadow border border-black/10">
            <h2 className="text-xl font-semibold mb-4">📅 Daily Usage</h2>

            {daily.length === 0 ? (
              <p className="text-black/60">최근 30일 사용량이 없습니다.</p>
            ) : (
              <ul className="space-y-2">
                {daily.map((d) => (
                  <li key={d.day} className="flex justify-between text-sm">
                    <span>{d.day}</span>
                    <span className="font-semibold">
                      {d.total_tokens} tokens
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* MONTHLY CARD */}
          <section className="mb-10 bg-white/70 backdrop-blur-xl p-6 rounded-xl shadow border border-black/10">
            <h2 className="text-xl font-semibold mb-4">📆 Monthly Usage</h2>

            {monthly.length === 0 ? (
              <p className="text-black/60">월간 사용량이 없습니다.</p>
            ) : (
              <ul className="space-y-2">
                {monthly.map((m) => (
                  <li key={m.month} className="flex justify-between text-sm">
                    <span>{m.month}</span>
                    <span className="font-semibold">
                      {m.total_tokens} tokens
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* FULL LOGS */}
          <section className="bg-white/70 backdrop-blur-xl p-6 rounded-xl shadow border border-black/10">
            <h2 className="text-xl font-semibold mb-4">📜 Full Usage Logs</h2>

            {logs.length === 0 ? (
              <p className="text-black/60">사용 기록이 없습니다.</p>
            ) : (
              <ul className="space-y-3">
                {logs.map((log, idx) => (
                  <li
                    key={idx}
                    className="
                      flex justify-between text-sm
                      border border-black/10 p-3 rounded-lg
                      bg-white/80
                    "
                  >
                    <span>{log.model}</span>
                    <span>{log.tokens} tokens</span>
                    <span className="text-black/50">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
