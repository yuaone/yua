// 📂 src/components/sidebar/BootDiskPanel.tsx
"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

type DiskInfo = {
  instance_id: string;
  size_gb: number;
  min_gb: number;
  max_gb: number;
};

export default function BootDiskPanel() {
  const { status, profile, authFetch } = useAuth();

  const [info, setInfo] = useState<DiskInfo | null>(null);
  const [newSize, setNewSize] = useState<number>(0);
  const [msg, setMsg] = useState("");

  async function load() {
    if (!profile?.instanceId) return;

    try {
      const res = await authFetch(
        `/api/instance/disk-info?instanceId=${profile.instanceId}`,
        { cache: "no-store" }
      );

      if (!res.ok) throw new Error();
      const data = await res.json();

      setInfo(data);
      setNewSize(data.size_gb);
    } catch {
      setMsg("⚠ 디스크 정보를 불러오지 못했습니다.");
    }
  }

  async function resize() {
    if (!info || !profile?.instanceId) return;

    try {
      const res = await authFetch("/api/instance/resize-disk", {
        method: "POST",
        body: JSON.stringify({
          instance_id: profile.instanceId,
          old_size: info.size_gb,
          new_size: newSize,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        setMsg("✔ 디스크 확장 요청 완료");
      } else {
        setMsg("❌ 실패: " + (data.message ?? "unknown error"));
      }
    } catch {
      setMsg("❌ 서버와 연결할 수 없습니다.");
    }
  }

  useEffect(() => {
    if (status === "authed") {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, profile?.instanceId]);

  if (status === "loading") {
    return <div className="text-black/50">로딩 중…</div>;
  }

  if (status !== "authed" || !profile?.instanceId) {
    return <div className="text-black/50">⚠ 인스턴스가 없습니다</div>;
  }

  if (!info) {
    return <div className="text-black/50">디스크 정보를 불러오는 중…</div>;
  }

  return (
    <div className="flex flex-col gap-8 text-black text-sm">
      <h2 className="text-lg font-semibold border-b border-black/10 pb-2">
        Boot Disk Resize
      </h2>

      <div className="bg-white/70 backdrop-blur-xl border border-black/10 rounded-xl p-6 shadow-md">
        <div className="space-y-1">
          <p>
            현재 크기: <b>{info.size_gb} GB</b>
          </p>
          <p>
            최소: {info.min_gb} GB / 최대: {info.max_gb} GB
          </p>
        </div>

        <input
          type="range"
          min={info.min_gb}
          max={info.max_gb}
          value={newSize}
          onChange={(e) => setNewSize(Number(e.target.value))}
          className="w-full mt-4"
        />

        <input
          type="number"
          className="w-full p-3 mt-3 bg-white/60 border border-black/20 rounded-lg"
          value={newSize}
          onChange={(e) => setNewSize(Number(e.target.value))}
        />

        <button
          onClick={resize}
          className="mt-4 px-4 py-2 bg-black text-white rounded-lg hover:bg-black/80"
        >
          Resize Disk
        </button>

        {msg && <p className="mt-3 text-sm text-emerald-600">{msg}</p>}
      </div>

      <div>
        <h3 className="text-sm font-semibold border-b border-black/10 pb-2 mb-3">
          SSH 수동 명령어
        </h3>
        <pre className="bg-[#0b0e12]/95 text-white p-4 rounded-xl text-sm">
sudo growpart /dev/sda 1
sudo resize2fs /dev/sda1
        </pre>
      </div>
    </div>
  );
}
