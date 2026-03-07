"use client";

import Link from "next/link";
import { Cpu, MemoryStick, Cloud, Server } from "lucide-react";

type InstanceCardProps = {
  id: string;
  ip?: string | null;
  cpu?: number;
  ram?: { used: number; total: number };
  status?: "RUNNING" | "STOPPED" | "ERROR" | "PROVISIONING";
  runtime?: "cloudrun" | "vm";
};

export default function InstanceCard({
  id,
  ip,
  cpu = 0,
  ram = { used: 0, total: 0 },
  status = "STOPPED",
  runtime = "cloudrun",
}: InstanceCardProps) {
  const isRunning = status === "RUNNING";
  const isProvisioning = status === "PROVISIONING";

  return (
    <Link
      href={`/instance/${id}`}
      className="glass hover:bg-white/80 transition border border-black/10 rounded-xl shadow p-5 flex justify-between items-center"
    >
      {/* LEFT */}
      <div className="flex flex-col gap-1">
        <span className="text-base font-semibold">{id}</span>
        <span className="text-xs text-black/50">IP: {ip ?? "-"}</span>
      </div>

      {/* RIGHT */}
      <div className="flex items-center gap-6 text-sm">
        <Metric
          icon={<Cpu size={14} />}
          label="CPU"
          value={`${cpu.toFixed(1)}%`}
        />
        <Metric
          icon={<MemoryStick size={14} />}
          label="RAM"
          value={`${ram.used}MB / ${ram.total}MB`}
        />

        {/* Runtime Badge */}
        <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full border bg-white">
          {runtime === "cloudrun" ? <Cloud size={12} /> : <Server size={12} />}
          {runtime === "cloudrun" ? "CloudRun" : "VM"}
        </span>

        {/* Status */}
        <span
          className={`text-xs px-3 py-1 rounded-full border ${
            isProvisioning
              ? "bg-yellow-100 text-yellow-700 border-yellow-300"
              : isRunning
              ? "bg-green-100 text-green-700 border-green-300"
              : "bg-red-100 text-red-700 border-red-300"
          }`}
        >
          {isProvisioning ? "Provisioning" : status}
        </span>
      </div>
    </Link>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 text-right">
      {icon}
      <div className="flex flex-col">
        <span className="text-xs text-black/50">{label}</span>
        <span className="font-medium">{value}</span>
      </div>
    </div>
  );
}
