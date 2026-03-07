"use client";

import { useEffect, useState } from "react";

type Snap = {
  snapshot_name: string;
  created_at: string;
};

export default function SnapshotPanel({ id }: { id: string }) {
  const [list, setList] = useState<Snap[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setError("");

    try {
      const res = await fetch(`/api/instance/${id}/snapshot/list`, {
        cache: "no-store",
      });

      const data = await res.json();
      if (data.ok) {
        setList(data.snapshots);
      } else {
        setError(data.error || "Failed to load snapshots");
      }
    } catch (e) {
      setError("Network error while loading snapshots.");
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  async function createSnap() {
    setLoading(true);
    setError("");

    const name = `snap-${Date.now()}`;

    try {
      const res = await fetch(`/api/instance/${id}/snapshot/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      const data = await res.json();
      if (!data.ok) setError(data.error || "Snapshot creation failed");
    } catch {
      setError("Snapshot creation failed.");
    }

    setLoading(false);
    load();
  }

  async function restoreSnap(name: string) {
    try {
      await fetch(`/api/instance/${id}/snapshot/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      alert("Snapshot restored!");
    } catch {
      alert("Restore failed");
    }
  }

  async function deleteSnap(name: string) {
    try {
      await fetch(`/api/instance/${id}/snapshot/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
    } catch {}

    load();
  }

  return (
    <div className="glass border border-black/10 rounded-xl p-6 shadow flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-black">Snapshots</h2>

      <button
        onClick={createSnap}
        disabled={loading}
        className="px-4 py-2 bg-black text-white rounded-lg hover:bg-black/80 w-fit"
      >
        {loading ? "Creating..." : "Create Snapshot"}
      </button>

      {error && <p className="text-red-600 text-sm">{error}</p>}

      <div className="flex flex-col gap-3 mt-4">
        {list.length === 0 && !error && (
          <p className="text-black/60 text-sm">No snapshots found.</p>
        )}

        {list.map((s) => (
          <div
            key={s.snapshot_name}
            className="flex justify-between items-center glass border border-black/10 rounded-lg p-3"
          >
            <div className="flex flex-col">
              <span className="font-medium">{s.snapshot_name}</span>
              <span className="text-xs text-black/50">
                {new Date(s.created_at).toLocaleString()}
              </span>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => restoreSnap(s.snapshot_name)}
                className="px-3 py-1 bg-blue-600 text-white rounded text-xs"
              >
                Restore
              </button>
              <button
                onClick={() => deleteSnap(s.snapshot_name)}
                className="px-3 py-1 bg-red-600 text-white rounded text-xs"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
