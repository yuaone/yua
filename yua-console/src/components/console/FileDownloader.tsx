"use client";

import { useEffect, useState } from "react";

export default function FileDownloader() {
  const [files, setFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/console/fs/list");
        const data = await res.json();
        setFiles(data.files || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const handleDownload = async (filename: string) => {
    const res = await fetch(`/api/console/fs/download?file=${filename}`);
    const blob = await res.blob();

    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="border border-slate-700/60 bg-slate-900/70 rounded-xl p-4 text-sm text-slate-300">
      <h2 className="font-semibold text-slate-200 mb-3">
        📥 다운로드 가능한 파일
      </h2>

      {loading && <p className="text-slate-500 text-xs">불러오는 중…</p>}

      {!loading && files.length === 0 && (
        <p className="text-slate-500 text-xs">파일이 없습니다.</p>
      )}

      <ul className="space-y-1">
        {files.map((f) => (
          <li
            key={f}
            className="cursor-pointer hover:text-emerald-300"
            onClick={() => handleDownload(f)}
          >
            • {f}
          </li>
        ))}
      </ul>
    </div>
  );
}
