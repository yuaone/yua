"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import InfoPanel from "@/components/instance/InfoPanel";
import MetricsPanel from "@/components/instance/MetricsPanel";
import DiskPanel from "@/components/instance/DiskPanel";
import SnapshotPanel from "@/components/instance/SnapshotPanel";
import LogsPanel from "@/components/instance/LogsPanel";
import { apiGet } from "@/lib/api";

/**
 * API에서 받아오는 느슨한 Instance 타입
 */
type InstanceDetail = {
  id: string;
  name?: string;
  status?: "RUNNING" | "STOPPED" | "ERROR" | "PROVISIONING";
  createdAt?: string;
  ip?: string | null;

  // 확장 필드 대비
  [key: string]: any;
};

/**
 * ✅ InfoPanel이 요구하는 정규화된 타입
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

export default function InstanceClient({ id }: { id: string }) {
  const [info, setInfo] = useState<InstanceDetail | null>(null);
  const [error, setError] = useState("");

  async function load() {
    try {
      const res = await apiGet(
        `${process.env.NEXT_PUBLIC_CORE_API}/instance/${id}`
      );

      if (!res.ok) throw new Error("instance fetch failed");

      // apiGet → ApiResponse<T>
      setInfo(res.data as InstanceDetail);
      setError("");
    } catch (e) {
      console.error(e);
      setError("인스턴스 정보를 불러올 수 없습니다.");
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  if (error) {
    return <p className="p-10 text-red-600">{error}</p>;
  }

  if (!info) {
    return <p className="p-10 text-black/60">Loading instance...</p>;
  }

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
        <span className="text-black">{info.name ?? id}</span>
      </div>

      {/* Panels */}
      <InfoPanel info={infoForPanel} />
      <MetricsPanel instanceId={id} />
      <DiskPanel id={id} />
      <SnapshotPanel id={id} />

      <div className="glass p-6">
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
