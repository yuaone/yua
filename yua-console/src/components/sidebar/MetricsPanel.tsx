// 📂 src/components/sidebar/MetricsPanel.tsx
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

type MetricsData = {
  cpu: number;
  ram: {
    used: number;
    total: number;
  };
  network: {
    rx: number;
    tx: number;
  };
};

function formatNumber(n: number) {
  if (n > 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n > 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}

export default function MetricsPanel() {
  const { status, profile, authFetch } = useAuth();

  const [data, setData] = useState<MetricsData | null>(null);
  const [intervalSec, setIntervalSec] = useState(5);

  async function load() {
    if (!profile?.instanceId) return;

    try {
      const res = await authFetch(
        `/api/instance/metrics?instanceId=${profile.instanceId}`,
        { cache: "no-store" }
      );

      if (!res.ok) throw new Error();
      const d = await res.json();
      setData(d);
    } catch {
      setData(null);
    }
  }

  useEffect(() => {
    if (status !== "authed") return;

    load();
    const timer = setInterval(load, intervalSec * 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalSec, status, profile?.instanceId]);

  if (status === "loading") {
    return <p className="text-black/60">⏳ 로딩 중…</p>;
  }

  if (status !== "authed" || !profile?.instanceId) {
    return <p className="text-black/50">⚠ 인스턴스 없음</p>;
  }

  if (!data) {
    return <p className="text-black/60">⏳ Metrics 불러오는 중…</p>;
  }

  return (
    <div className="flex flex-col gap-6 text-black text-sm">
      {/* Refresh Control */}
      <div className="flex justify-end">
        <select
          value={intervalSec}
          onChange={(e) => setIntervalSec(Number(e.target.value))}
          className="px-2 py-1 bg-white/60 border border-black/20 rounded-lg shadow-sm"
        >
          <option value={1}>1초</option>
          <option value={5}>5초</option>
          <option value={10}>10초</option>
          <option value={30}>30초</option>
        </select>
      </div>

      {/* CPU */}
      <div className="bg-white/70 rounded-xl border border-black/10 shadow p-4 backdrop-blur-xl">
        <div className="flex justify-between">
          <span className="font-medium">CPU Usage</span>
          <span className="font-semibold">{data.cpu}%</span>
        </div>
        <div className="w-full bg-black/10 h-2 rounded mt-2">
          <div className="bg-black h-2 rounded" style={{ width: `${data.cpu}%` }} />
        </div>
      </div>

      {/* RAM */}
      <div className="bg-white/70 rounded-xl border border-black/10 shadow p-4 backdrop-blur-xl">
        <div className="flex justify-between">
          <span className="font-medium">Memory Usage</span>
          <span className="font-semibold">
            {data.ram.used}MB / {data.ram.total}MB
          </span>
        </div>
        <div className="w-full bg-black/10 h-2 rounded mt-2">
          <div
            className="bg-black h-2 rounded"
            style={{ width: `${(data.ram.used / data.ram.total) * 100}%` }}
          />
        </div>
      </div>

      {/* NETWORK */}
      <div className="bg-white/70 rounded-xl border border-black/10 shadow p-4 backdrop-blur-xl">
        <h4 className="font-medium mb-2">Network</h4>
        <div className="flex justify-between text-black/70">
          <span>RX:</span>
          <span>{formatNumber(data.network.rx)} bytes</span>
        </div>
        <div className="flex justify-between text-black/70">
          <span>TX:</span>
          <span>{formatNumber(data.network.tx)} bytes</span>
        </div>
      </div>
    </div>
  );
}
