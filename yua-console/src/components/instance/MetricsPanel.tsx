"use client";

import { useEffect, useState } from "react";
import { agentFetch } from "@/lib/agent";

type Metrics = {
  cpu: number;
  memory: { used: number; total: number };
  disk: { used: number; total: number };
};

export default function MetricsPanel({
  instanceId,
}: {
  instanceId: string;
}) {
  const [m, setM] = useState<Metrics | null>(null);
  const [error, setError] = useState("");

  async function load() {
    try {
      const res = await agentFetch("/metrics", "GET");

      if (!res || !res.ok) {
        setError("Failed to load metrics");
        return;
      }

      setM({
        cpu: res.cpu ?? 0,
        memory: res.memory ?? { used: 0, total: 0 },
        disk: res.disk ?? { used: 0, total: 0 },
      });

      setError("");
    } catch (e) {
      console.error(e);
      setError("Agent unreachable");
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [instanceId]);

  if (!m) {
    return (
      <div className="glass rounded-xl p-6">
        <p className="text-black/60">Loading metrics...</p>
      </div>
    );
  }

  return (
    <div className="glass border border-black/10 rounded-xl shadow p-6">
      <h2 className="text-lg font-semibold mb-4">VM Metrics</h2>

      {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

      <div className="grid grid-cols-2 gap-6">
        <Item label="CPU" value={`${m.cpu.toFixed(1)} %`} />
        <Item
          label="Memory"
          value={`${m.memory.used}MB / ${m.memory.total}MB`}
        />
        <Item
          label="Disk"
          value={`${m.disk.used}MB / ${m.disk.total}MB`}
        />
      </div>
    </div>
  );
}

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-black/50">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
