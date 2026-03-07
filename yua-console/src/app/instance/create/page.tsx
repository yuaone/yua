"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Tier = {
  id: string;
  label: string;
};

type TierMap = {
  cpu: Tier[];
  memory: Tier[];
  disk: Tier[];
  engine: Tier[];
  qpu: Tier[];
  omega: Tier[];
};

export default function CreateInstancePage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [runtimeType, setRuntimeType] =
    useState<"cloudrun" | "vm">("cloudrun");

  const [tiers, setTiers] = useState<TierMap>({
    cpu: [],
    memory: [],
    disk: [],
    engine: [],
    qpu: [],
    omega: [],
  });

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Tier는 미래 확장용 – 지금은 fetch만 유지
  useEffect(() => {
    fetch("/api/instance/tier", { cache: "no-store" })
      .then((r) => r.json())
      .then(setTiers)
      .catch(() => {
        /* tier 실패는 생성 UX를 막지 않음 */
      });
  }, []);

  async function onCreate() {
    if (!name.trim()) {
      setErr("Instance name is required");
      return;
    }

    setErr(null);
    setLoading(true);

    try {
      const res = await fetch("/api/instance/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          runtimeType,
        }),
      });

      const data = await res.json();
      if (!data.ok) {
        throw new Error(data.error ?? "Create failed");
      }

      // 🔥 PROVISIONING 상태 상세 페이지로 즉시 이동
      router.push(`/instance/${data.instanceId}`);
    } catch (e: any) {
      setErr(e.message ?? "Create failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-10 space-y-6">
      <h1 className="text-3xl font-bold">Create Instance</h1>

      <div className="glass p-6 rounded-xl space-y-4">
        <TextInput
          label="Instance Name"
          value={name}
          onChange={setName}
        />

        <div className="flex flex-col gap-1">
          <label className="text-sm">Runtime</label>
          <select
            value={runtimeType}
            onChange={(e) =>
              setRuntimeType(e.target.value as "cloudrun" | "vm")
            }
            className="border px-3 py-2 rounded-lg"
          >
            <option value="cloudrun">CloudRun</option>
            <option value="vm">VM / Docker</option>
          </select>
          <p className="text-xs text-black/50">
            CloudRun은 빠르게 시작되며, VM은 터미널 사용이 가능합니다.
          </p>
        </div>

        {err && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {err}
          </div>
        )}

        <button
          disabled={loading}
          onClick={onCreate}
          className="px-4 py-2 bg-black text-white rounded-lg disabled:opacity-50"
        >
          {loading ? "Creating…" : "Create Instance"}
        </button>
      </div>
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm">{label}</label>
      <input
        className="border px-3 py-2 rounded-lg"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
