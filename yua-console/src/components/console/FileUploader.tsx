// src/components/console/FileUploader.tsx
"use client";

import { useState } from "react";

type Props = {
  onUploaded?: (file: string, path: string) => void;
};

// ✅ 업로드 헬퍼 (백엔드 FS 엔진 호출)
async function uploadFile(file: File) {
  const form = new FormData();
  form.append("file", file);

  const res = await fetch("/console/fs/upload", {
    method: "POST",
    body: form,
  });

  if (!res.ok) {
    throw new Error("file upload failed");
  }

  return res.json() as Promise<{
    filename: string;
    saved: string;
  }>;
}

export default function FileUploader({ onUploaded }: Props) {
  const [dragging, setDragging] = useState(false);

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const result = await uploadFile(file);
    onUploaded?.(result.filename, result.saved);
  };

  const handleInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await uploadFile(file);
    onUploaded?.(result.filename, result.saved);
  };

  return (
    <div
      className={`border border-slate-700/60 rounded-xl p-4 
      bg-slate-900/70 text-slate-300 text-sm cursor-pointer 
      ${dragging ? "border-emerald-400 bg-slate-800/80" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      onClick={() => document.getElementById("file-upload")?.click()}
    >
      <input
        id="file-upload"
        type="file"
        className="hidden"
        onChange={handleInput}
      />
      <div className="text-center">
        📁 파일 업로드 (클릭 또는 드래그)
      </div>
    </div>
  );
}
