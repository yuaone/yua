// src/components/chat/ChatFileUploader.tsx
"use client";

import { useRef } from "react";
import { FileType } from "@/types/chat";

export default function ChatFileUploader({
  onFiles,
}: {
  onFiles: (files: File[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const pick = () => inputRef.current?.click();

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) onFiles(Array.from(e.target.files));
        }}
      />

      <button
        onClick={pick}
        className="px-3 py-1.5 rounded-lg bg-black text-white text-xs hover:bg-black/70 transition"
      >
        +
      </button>
    </>
  );
}
