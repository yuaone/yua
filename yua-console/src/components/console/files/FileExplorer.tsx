"use client";

import { useEffect, useState, useMemo } from "react";
import FileTree from "./FileTree";
import { Upload, RefreshCw, Search } from "lucide-react";

export default function FileExplorer({
  onOpenFile,
}: {
  onOpenFile: (path: string) => void;
}) {
  const [tree, setTree] = useState<any[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadTree() {
    setLoading(true);

    try {
      const res = await fetch("/api/console/fs/tree", { cache: "no-store" });
      const data = await res.json();
      if (data.success) setTree(data.tree);
      else setTree([]);
    } catch {
      setTree([]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadTree();
    const handler = () => loadTree();
    window.addEventListener("fs:reload", handler);
    return () => window.removeEventListener("fs:reload", handler);
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return tree;
    const lower = query.toLowerCase();

    const filterNode = (node: any): boolean => {
      if (node.name.toLowerCase().includes(lower)) return true;
      if (!node.children) return false;
      return node.children.some(filterNode);
    };

    return tree.filter(filterNode);
  }, [tree, query]);

  async function handleUpload(e: any) {
    const file = e.target.files?.[0];
    if (!file) return;

    const form = new FormData();
    form.append("file", file);

    try {
      await fetch("https://api.yuaone.com/console/fs/upload", {
        method: "POST",
        body: form,
      });
    } catch {}

    loadTree();
  }

  return (
    <div className="flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between bg-white/80 backdrop-blur-xl border border-black/10 rounded-lg px-3 py-2">
        <span className="text-sm font-semibold text-black">Explorer</span>
        <button
          onClick={loadTree}
          className="p-1.5 rounded-md bg-black text-white hover:bg-black/80"
        >
          <RefreshCw size={14} />
        </button>
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search..."
          className="w-full pl-8 pr-3 py-2 rounded-lg bg-white/70 backdrop-blur-xl border border-black/10 text-sm focus:outline-none focus:ring-2 focus:ring-black/20"
        />
      </div>

      <div className="flex-1 overflow-auto rounded-xl bg-white/60 backdrop-blur-xl border border-black/10 p-3">
        {loading ? (
          <p className="text-xs text-black/40">Loading...</p>
        ) : (
          <FileTree tree={filtered} onSelect={onOpenFile} />
        )}
      </div>

      <label className="w-full flex items-center gap-2 justify-center py-2 text-sm cursor-pointer bg-black text-white rounded-lg hover:bg-black/80">
        <Upload size={15} />
        Upload File
        <input type="file" hidden onChange={handleUpload} />
      </label>
    </div>
  );
}
