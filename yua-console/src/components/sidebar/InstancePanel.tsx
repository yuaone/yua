/* ✨ Snapshot 섹션 업그레이드 버전 포함 InstancePanel ✨ */

"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";

import BootDiskPanel from "@/components/sidebar/BootDiskPanel";
import MetricsPanel from "@/components/sidebar/MetricsPanel";
import { Clock, RefreshCcw, Trash2, HardDrive } from "lucide-react";

/* ==============================
   UI Helpers
============================== */

function StatusBadge({ status }: { status?: string }) {
  if (!status) return null;

  const cls =
    status === "RUNNING"
      ? "bg-green-100 text-green-700 border-green-300"
      : status === "ERROR"
      ? "bg-red-100 text-red-700 border-red-300"
      : "bg-gray-100 text-gray-700 border-gray-300";

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-md border ${cls}`}>
      {status}
    </span>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white/70 backdrop-blur-xl border border-black/10 rounded-xl p-6 shadow-md">
      <h3 className="text-lg font-semibold text-black border-b border-black/10 pb-2 mb-4">
        {title}
      </h3>
      {children}
    </div>
  );
}

/* ==============================
   Component
============================== */

export default function InstancePanel() {
  const { status, profile, authFetch } = useAuth();
  const instanceId = profile?.instanceId;

  const [info, setInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const [image, setImage] = useState("");
  const [env, setEnv] = useState("");
  const [newPort, setNewPort] = useState("");

  const [snapshots, setSnapshots] = useState<any[]>([]);
  const [snapshotLoading, setSnapshotLoading] = useState(false);

  /* ==============================
     Instance Info
  ============================== */

  const loadInfo = useCallback(async () => {
    if (!instanceId) return;

    try {
      setLoading(true);
      const res = await authFetch(
        `/api/instance/check?instanceId=${instanceId}`,
        { cache: "no-store" }
      );
      const data = await res.json();
      if (!data.firewall) data.firewall = [];
      setInfo(data);
    } finally {
      setLoading(false);
    }
  }, [authFetch, instanceId]);

  useEffect(() => {
    if (status === "authed") loadInfo();
  }, [loadInfo, status]);

  /* ==============================
     Snapshots
  ============================== */

  const loadSnapshots = useCallback(async () => {
    if (!instanceId) return;

    try {
      setSnapshotLoading(true);
      const res = await authFetch(
        `/api/instance/snapshot/list?instanceId=${instanceId}`,
        { cache: "no-store" }
      );
      const data = await res.json();

      if (data.ok) {
        const sorted = [...(data.snapshots ?? [])].sort(
          (a, b) =>
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
        );
        setSnapshots(sorted);
      }
    } finally {
      setSnapshotLoading(false);
    }
  }, [authFetch, instanceId]);

  useEffect(() => {
    loadSnapshots();
  }, [loadSnapshots]);

  async function createSnapshot() {
    if (!instanceId) return;

    const name = `snap-${Date.now()}`;
    setMsg("📦 스냅샷 생성 중...");

    const res = await authFetch("/api/instance/snapshot/create", {
      method: "POST",
      body: JSON.stringify({ instanceId, name }),
    });

    const r = await res.json();
    if (r.ok) {
      setMsg("✔ 스냅샷 생성 완료");
      loadSnapshots();
    } else {
      setMsg(`❌ 실패: ${r.message}`);
    }
  }

  async function restoreSnapshot(name: string) {
    if (!instanceId) return;
    if (!confirm(`스냅샷 '${name}' 복구하시겠습니까?`)) return;

    setMsg("⏳ 복구 중...");
    const res = await authFetch("/api/instance/snapshot/restore", {
      method: "POST",
      body: JSON.stringify({ instanceId, name }),
    });

    const r = await res.json();
    setMsg(r.ok ? "✔ 복구 완료" : `❌ 실패: ${r.message}`);
  }

  async function deleteSnapshot(name: string) {
    if (!instanceId) return;
    if (!confirm(`스냅샷 '${name}' 삭제할까요?`)) return;

    const res = await authFetch("/api/instance/snapshot/delete", {
      method: "POST",
      body: JSON.stringify({ instanceId, name }),
    });

    const r = await res.json();
    if (r.ok) loadSnapshots();
  }

  /* ==============================
     Deploy / Restart
  ============================== */

  async function deploy() {
    if (!instanceId) return;

    setMsg("🚀 Deploying...");
    const res = await authFetch("/api/instance/deploy", {
      method: "POST",
      body: JSON.stringify({ instanceId, image, env }),
    });

    const r = await res.json();
    setMsg(r.ok ? "✔ 배포 완료" : "❌ 배포 실패");
  }

  async function restart() {
    if (!instanceId) return;

    setMsg("⏳ 컨테이너 재시작 중...");
    const res = await authFetch("/api/instance/restart", {
      method: "POST",
      body: JSON.stringify({ instanceId }),
    });

    const r = await res.json();
    setMsg(r.ok ? "✔ 완료" : "❌ 실패");
  }

  const showLogs = () => window.open("/logs", "_blank");

  /* ==============================
     Firewall
  ============================== */

  async function addRule() {
    const port = Number(newPort);
    if (!instanceId || !port || port < 1 || port > 65535) return;

    const res = await authFetch("/api/instance/firewall/add", {
      method: "POST",
      body: JSON.stringify({ instanceId, port }),
    });

    const r = await res.json();
    if (r.ok) {
      await loadInfo();
      setNewPort("");
    }
  }

  async function removeRule(port: number) {
    if (!instanceId) return;

    const res = await authFetch("/api/instance/firewall/remove", {
      method: "POST",
      body: JSON.stringify({ instanceId, port }),
    });

    const r = await res.json();
    if (r.ok) await loadInfo();
  }

  /* ==============================
     Guards
  ============================== */

  if (status !== "authed") {
    return <p className="text-black/50">⚠ 로그인 필요</p>;
  }

  if (!instanceId) {
    return <p className="text-black/50">⚠ 연결된 인스턴스 없음</p>;
  }

  if (!info) {
    return <p className="text-black/50">인스턴스 정보를 불러오는 중…</p>;
  }

  /* ==============================
     Render
  ============================== */

  return (
    <div className="flex flex-col gap-8 text-black text-sm">

      <Section title="Instance Overview">
        <div className="flex flex-col gap-3">
          <div className="flex justify-between">
            <span className="font-medium">Instance ID</span>
            <span>{instanceId}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="font-medium">Status</span>
            <StatusBadge status={info.status} />
          </div>

          <div className="flex justify-between">
            <span className="font-medium">Public IP</span>
            <span>{info.ip}</span>
          </div>

          {loading && (
            <p className="text-xs text-black/50 mt-1">상태 새로고침 중…</p>
          )}

          <button
            onClick={() =>
              window.open(`/instance/${instanceId}/terminal`, "_blank")
            }
            className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-500"
          >
            🖥️ SSH Connect
          </button>
        </div>
      </Section>

      <Section title="Instance Metrics">
        <MetricsPanel />
      </Section>

      <Section title="Boot Disk">
        <BootDiskPanel />
      </Section>

      <Section title="Firewall Rules">
        <div className="flex gap-3 mb-4">
          <input
            type="number"
            className="flex-1 px-3 py-2 bg-white/60 border border-black/20 rounded-lg shadow-sm"
            value={newPort}
            onChange={(e) => setNewPort(e.target.value)}
            placeholder="포트 예: 5000"
          />
          <button
            onClick={addRule}
            className="px-4 py-2 bg-black text-white rounded-lg shadow hover:bg-black/80"
          >
            추가
          </button>
        </div>

        {(info.firewall ?? []).map((rule: any) => (
          <div
            key={rule.port}
            className="flex justify-between items-center bg-white border border-black/10 rounded-lg p-3 shadow-sm"
          >
            <span className="font-medium">{rule.port}/tcp</span>
            <button
              onClick={() => removeRule(rule.port)}
              className="text-red-600 text-xs hover:underline"
            >
              삭제
            </button>
          </div>
        ))}
      </Section>

      <Section title="Snapshots">
        <button
          onClick={createSnapshot}
          className="px-4 py-2 bg-black text-white rounded-lg shadow mb-4"
        >
          📦 Create Snapshot
        </button>

        {snapshotLoading && (
          <p className="text-black/50 text-xs">스냅샷 불러오는 중…</p>
        )}

        <div className="flex flex-col gap-3">
          {snapshots.map((s) => (
            <div
              key={s.snapshot_name}
              className="flex justify-between items-center bg-white border border-black/10 rounded-lg p-3 shadow-sm"
            >
              <div className="flex items-center gap-3">
                <HardDrive size={18} className="text-black/50" />
                <div>
                  <span className="font-medium">{s.snapshot_name}</span>
                  {s.created_at && (
                    <span className="text-xs text-black/50 flex items-center gap-1">
                      <Clock size={12} />
                      {new Date(s.created_at).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => restoreSnapshot(s.snapshot_name)}
                  className="text-blue-600 text-xs flex items-center gap-1"
                >
                  <RefreshCcw size={14} /> 복구
                </button>
                <button
                  onClick={() => deleteSnapshot(s.snapshot_name)}
                  className="text-red-600 text-xs flex items-center gap-1"
                >
                  <Trash2 size={14} /> 삭제
                </button>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Container Deploy">
        <input
          type="text"
          placeholder="이미지 태그 예: ghcr.io/org/app:latest"
          className="w-full p-3 bg-white/60 border border-black/20 rounded-xl shadow-sm"
          value={image}
          onChange={(e) => setImage(e.target.value)}
        />

        <textarea
          placeholder="ENV_KEY=VALUE"
          className="w-full p-3 mt-3 bg-white/60 border border-black/20 rounded-xl shadow-sm"
          rows={3}
          value={env}
          onChange={(e) => setEnv(e.target.value)}
        />

        <button
          onClick={deploy}
          className="mt-4 px-4 py-2 bg-black text-white rounded-lg shadow hover:bg-black/80"
        >
          🚀 Deploy Container
        </button>

        <button
          onClick={restart}
          className="mt-3 px-4 py-2 bg-gray-700 text-white rounded-lg shadow hover:bg-gray-600"
        >
          Restart Container
        </button>

        <button
          onClick={showLogs}
          className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded-lg shadow hover:bg-indigo-500"
        >
          View Logs
        </button>

        {msg && <p className="mt-4 text-sm text-green-600">{msg}</p>}
      </Section>
    </div>
  );
}
