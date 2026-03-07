"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type InfoPanelProps = {
  info: {
    id: string;
    status: "RUNNING" | "STOPPED" | "ERROR" | "PROVISIONING";
    cpu: number;
    memory: number;
    disk_size: number;
    ip_address?: string | null;
    created_at: string;
    provider?: "cloudrun" | "vm";
  };
  refresh?: () => void;
};

const STATUS_COPY: Record<InfoPanelProps["info"]["status"], string> = {
  RUNNING: "인스턴스가 정상적으로 실행 중입니다.",
  PROVISIONING: "리소스를 준비 중입니다. 잠시만 기다려주세요.",
  STOPPED: "인스턴스가 중지된 상태입니다.",
  ERROR: "인스턴스 실행 중 오류가 발생했습니다.",
};

export default function InfoPanel({ info, refresh }: InfoPanelProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<null | "stop" | "delete">(null);
  const [error, setError] = useState<string | null>(null);

  const isCloudRun = info.provider === "cloudrun";

  async function callAPI(
    action: "stop" | "delete",
    opts?: { redirect?: boolean; confirm?: boolean }
  ) {
    if (opts?.confirm) {
      const ok = confirm(
        "이 작업은 되돌릴 수 없습니다.\n정말로 삭제하시겠습니까?"
      );
      if (!ok) return;
    }

    setError(null);
    setLoading(action);

    try {
      const res = await fetch(`/api/instance/${info.id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "요청에 실패했습니다.");

      if (opts?.redirect) router.push("/instance");
      else refresh?.();
    } catch (e: any) {
      setError(e.message ?? "요청 처리 중 오류가 발생했습니다.");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="glass border border-black/10 rounded-xl shadow p-6 flex flex-col gap-6">
      {/* HEADER */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-lg font-semibold">Instance Info</h2>
          <p className="text-xs text-black/50">{STATUS_COPY[info.status]}</p>
        </div>

        <span
          className={`text-xs px-3 py-1 rounded-full border ${
            info.status === "RUNNING"
              ? "bg-green-100 text-green-700 border-green-300"
              : info.status === "PROVISIONING"
              ? "bg-yellow-100 text-yellow-700 border-yellow-300"
              : "bg-red-100 text-red-700 border-red-300"
          }`}
        >
          {info.status}
        </span>
      </div>

      {/* INFO GRID */}
      <div className="grid grid-cols-2 gap-6 text-sm">
        <Item label="Instance ID" value={info.id} />
        <Item label="Provider" value={isCloudRun ? "CloudRun" : "VM"} />
        <Item label="CPU" value={`${info.cpu} cores`} />
        <Item label="Memory" value={`${info.memory} MB`} />
        <Item label="Disk" value={`${info.disk_size} GB`} />
        <Item
          label="IP Address"
          value={
            isCloudRun
              ? "CloudRun does not expose fixed IP"
              : info.ip_address ?? "-"
          }
        />
        <Item
          label="Created"
          value={new Date(info.created_at).toLocaleString()}
        />
      </div>

      {/* ERROR */}
      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {/* ACTIONS */}
      <div className="flex gap-3 pt-2 flex-wrap">
        <button
          title={
            isCloudRun ? "CloudRun 인스턴스는 중지할 수 없습니다." : undefined
          }
          onClick={() => callAPI("stop")}
          disabled={!!loading || isCloudRun}
          className="px-4 py-2 bg-yellow-600 text-white rounded-lg disabled:opacity-50"
        >
          {loading === "stop" ? "Stopping…" : "Stop"}
        </button>

        <button
          onClick={() =>
            callAPI("delete", { redirect: true, confirm: true })
          }
          disabled={!!loading}
          className="px-4 py-2 bg-red-600 text-white rounded-lg disabled:opacity-50 ml-auto"
        >
          {loading === "delete" ? "Deleting…" : "Delete"}
        </button>
      </div>

      {isCloudRun && (
        <p className="text-xs text-black/50 pt-1">
          CloudRun 인스턴스는 Stop / Restart 기능이 제한됩니다.
        </p>
      )}
    </div>
  );
}

function Item({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-xs text-black/50">{label}</span>
      <span className="text-sm font-medium">{value ?? "-"}</span>
    </div>
  );
}
