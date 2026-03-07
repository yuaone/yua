"use client";

import Image from "next/image";
import { FileType } from "@/types/chat";
import { Download } from "lucide-react";

export default function ChatFilePreview({ file }: { file: FileType }) {
  const isImg = file.type.startsWith("image/");

  const sizeKB = file.size ? (file.size / 1024).toFixed(1) + " KB" : "";

  return (
    <div
      className="
        w-full flex items-center justify-between
        p-2 border border-black/10 rounded-xl 
        bg-white/60 backdrop-blur
      "
    >
      <div className="flex items-center gap-3">
        {isImg ? (
          <Image
            src={file.url}
            alt={file.name}
            width={56}
            height={56}
            className="rounded-lg object-cover border border-black/10"
          />
        ) : (
          <div
            className="
              w-14 h-14 rounded-lg bg-black/10 
              flex items-center justify-center text-xs text-black/60
            "
          >
            FILE
          </div>
        )}

        <div className="flex flex-col">
          <span className="text-sm font-medium truncate max-w-[150px]">
            {file.name}
          </span>
          <span className="text-xs text-black/40">{sizeKB}</span>
        </div>
      </div>

      {/* 다운로드 버튼 */}
      <a
        href={file.url}
        download={file.name}
        className="
          p-2 rounded-lg hover:bg-black/10 
          text-black/60 hover:text-black transition
        "
      >
        <Download size={16} />
      </a>
    </div>
  );
}
