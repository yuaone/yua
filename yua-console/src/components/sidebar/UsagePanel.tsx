"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";

export default function UsagePanel() {
  const [usage, setUsage] = useState<any>(null);

  useEffect(() => {
    async function load() {
      const res = await apiGet("/api/usage");
      if (res.ok) setUsage(res);
    }
    load();
  }, []);

  if (!usage) {
    return (
      <p className="text-black/50 text-sm">⏳ 사용량을 불러오는 중…</p>
    );
  }

  return (
    <div className="flex flex-col gap-4 text-black">

      <h2 className="text-lg font-semibold">Usage</h2>

      {/* 총 사용량 */}
      <div className="p-4 bg-white/80 border border-black/10 rounded-xl shadow">
        <p className="text-black/60 text-sm">이번 달 총 사용량</p>
        <p className="text-2xl font-semibold">{usage.total_tokens} tokens</p>
      </div>

      {/* 모델별 상세 */}
      <div className="p-4 bg-white/80 border border-black/10 rounded-xl shadow">
        <p className="text-black/60 text-sm mb-2">모델별 사용량</p>

        <div className="flex flex-col gap-2">
          {Object.entries(usage.models).map(([model, count]: any) => (
            <div key={model} className="flex justify-between text-sm">
              <span>{model}</span>
              <span className="text-black/70">{count} tokens</span>
            </div>
          ))}
        </div>
      </div>

      {/* 일별 사용량 */}
      <div className="p-4 bg-white/80 border border-black/10 rounded-xl shadow">
        <p className="text-black/60 text-sm mb-2">일별 사용량</p>

        <div className="flex flex-col gap-2 text-sm">
          {usage.daily.map((d: any) => (
            <div key={d.date} className="flex justify-between">
              <span>{d.date}</span>
              <span className="text-black/70">{d.count} calls</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
