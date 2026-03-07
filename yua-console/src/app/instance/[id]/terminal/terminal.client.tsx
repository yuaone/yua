"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import TerminalLayout from "@/components/console/terminal/TerminalLayout";

type InstanceInfo = {
  id: string;
  status?: "RUNNING" | "STOPPED" | "ERROR" | "PROVISIONING";
  cpuTier?: string;
  qpuTier?: string | null;
  provider?: "cloudrun" | "vm";
};

export default function TerminalClient({ id }: { id: string }) {
  const [info, setInfo] = useState<InstanceInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        setLoading(true);

        const res = await fetch(`/api/instance/check?id=${id}`, {
          cache: "no-store",
        });

        const data = await res.json();
        if (!mounted) return;

        if (!data?.ok && data?.db) {
          setInfo({
            id,
            status: data.db.status,
            provider: data.db.provider,
          });
          return;
        }

        setInfo({
          id,
          status: data.db?.status ?? data.status,
          provider: data.db?.provider ?? "vm",
          cpuTier: data.db?.cpuTier,
          qpuTier: data.db?.qpuTier,
        });
      } catch {
        if (mounted) setError("인스턴스 정보를 불러오지 못했습니다.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center text-black/60">
        Loading terminal…
      </div>
    );
  }

  if (error || !info) {
    return (
      <div className="w-full h-screen flex flex-col items-center justify-center gap-3">
        <p className="text-sm text-red-600">
          {error ?? "인스턴스를 찾을 수 없습니다."}
        </p>
        <Link href="/instance" className="text-sm underline">
          인스턴스 목록으로 돌아가기
        </Link>
      </div>
    );
  }

  const isCloudRun = info.provider === "cloudrun";

  return (
    <div className="w-full h-screen flex flex-col bg-white">
      <div className="p-4 border-b border-black/10 flex justify-between items-center bg-white/70 backdrop-blur-xl">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold text-black">
            Terminal — {id}
          </h1>

          <p className="text-xs text-black/50">
            Ubuntu Linux Shell · YUA ONE Instance
          </p>

          <div className="flex items-center gap-3 text-[11px] text-black/40">
            {info.cpuTier && <span>CPU: {info.cpuTier}</span>}
            <span>QPU: {info.qpuTier ?? "None"}</span>
            <span>
              Provider: {isCloudRun ? "CloudRun" : "VM / Docker"}
            </span>
          </div>
        </div>

        <Link
          href={`/instance/${id}`}
          className="text-sm text-black/60 hover:underline"
        >
          ← Back
        </Link>
      </div>

      <div className="flex-1 min-h-0">
        {isCloudRun ? (
          <div className="w-full h-full flex items-center justify-center text-sm text-black/60">
            CloudRun 인스턴스는 SSH 터미널을 지원하지 않습니다.
          </div>
        ) : (
          <TerminalLayout instanceId={id} />
        )}
      </div>
    </div>
  );
}
