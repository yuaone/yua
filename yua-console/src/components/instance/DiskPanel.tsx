// 📂 src/components/instance/DiskPanel.tsx
"use client";

import { useEffect, useState } from "react";

export default function DiskPanel({ id }: { id: string }) {
  const [disk, setDisk] = useState<number | null>(null);
  const [newSize, setNewSize] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  async function loadDisk() {
    const res = await fetch(`/api/instance/${id}/disk-info`, { cache: "no-store" });
    const data = await res.json();
    if (data.ok) setDisk(data.size_gb);
  }

  useEffect(() => {
    loadDisk();
  }, [id]);

  async function resize() {
    if (newSize <= (disk ?? 0)) {
      alert("New size must be greater than current size.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/instance/${id}/resize-disk`, {
        method: "POST",
        cache: "no-store",
        body: JSON.stringify({ new_size: newSize }),
      });
      const data = await res.json();
      if (data.ok) alert("Resize requested!");
      loadDisk();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass border border-black/10 rounded-xl p-6 shadow flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-black">Disk Resize</h2>

      <p className="text-black/60 text-sm">Current: {disk ?? 0} GB</p>

      <div className="flex items-center gap-3">
        <input
          type="number"
          value={newSize}
          onChange={(e) => setNewSize(Number(e.target.value))}
          placeholder="New size (GB)"
          className="px-3 py-2 rounded-lg border border-black/20 bg-white w-40"
        />
        <button
          onClick={resize}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-black text-white hover:bg-black/80"
        >
          {loading ? "Resizing..." : "Resize"}
        </button>
      </div>
    </div>
  );
}
