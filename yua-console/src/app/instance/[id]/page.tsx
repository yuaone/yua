// 📂 src/app/instance/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import InfoPanel from "@/components/instance/InfoPanel";
import MetricsPanel from "@/components/instance/MetricsPanel";
import DiskPanel from "@/components/instance/DiskPanel";
import SnapshotPanel from "@/components/instance/SnapshotPanel";
import LogsPanel from "@/components/instance/LogsPanel";

/**
 * API에서 받아오는 원본 Instance (느슨한 타입)
 */
type InstanceDetail = {
  id: string;
  name?: string;
  status?: string;
  cpuTier?: string;
  nodeTier?: string;
  engineTier?: string;
  qpuTier?: string | null;
  omegaTier?: string | null;
  createdAt?: string;
  ip?: string | null;

  // 혹시 모를 확장 필드
  [key: string]: any;
};

/**
 * InfoPanel이 요구하는 정규화된 Instance 타입
 */
type InfoPanelInstance = {
  id: string;
  status: "ERROR" | "RUNNING" | "STOPPED" | "PROVISIONING";
  cpu: number;
  memory: number;
  disk_size: number;
  created_at: string;
  ip_address?: string | null;
  provider?: "cloudrun" | "vm";
};

export default function Page(props: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState("");

  useEffect(() => {
    props.params.then((p) => setId(p.id));
  }, [props.params]);

  if (!id) return <p>Loading...</p>;

  return <InstanceDetailPage id={id} />;
}

function InstanceDetailPage({ id }: { id: string }) {
  const [info, setInfo] = useState<InstanceDetail | null>(null);

  async function load() {
    const res = await fetch(`/api/instance/check?id=${id}`, {
      cache: "no-store",
    });
    setInfo(await res.json());
  }

  useEffect(() => {
    load();
  }, [id]);

  if (!info)
    return <p className="p-10 text-black/60">Loading instance...</p>;

  /**
   * ✅ InfoPanel 전용 정규화 객체
   * (기존 info는 그대로 유지)
   */
  const infoForPanel: InfoPanelInstance = {
    id: info.id,
    status:
      info.status === "RUNNING" ||
      info.status === "STOPPED" ||
      info.status === "ERROR" ||
      info.status === "PROVISIONING"
        ? info.status
        : "STOPPED",

    cpu: Number(info.cpu ?? 0),
    memory: Number(info.memory ?? 0),
    disk_size: Number(info.disk_size ?? 0),
    created_at: info.createdAt ?? new Date().toISOString(),
    ip_address: info.ip ?? null,
    provider: info.provider,
  };

  return (
    <div className="w-full max-w-6xl mx-auto py-10 flex flex-col gap-10">

      {/* Breadcrumb */}
      <div className="text-xs text-black/50 flex items-center gap-2">
        <Link href="/instance" className="hover:underline">
          Instances
        </Link>
        <span>/</span>
        <span className="text-black">{id}</span>
      </div>

      {/* Panels */}
      <InfoPanel info={infoForPanel} />
      <MetricsPanel instanceId={id} />
      <DiskPanel id={id} />
      <SnapshotPanel id={id} />

      <div className="bg-white/60 backdrop-blur-xl border border-black/10 rounded-xl shadow-md p-6">
        <LogsPanel instanceId={id} />
      </div>

      <Link
        href={`/instance/${id}/terminal`}
        className="px-4 py-2 bg-black text-white rounded-lg w-fit hover:bg-black/80 transition"
      >
        Open Terminal
      </Link>
    </div>
  );
}
