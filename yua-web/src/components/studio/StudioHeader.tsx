"use client";

import { X } from "lucide-react";
import { useStudioContext } from "@/store/useStudioContext";

type Props = {
  mode: "image" | "document" | "video";
  rightAction?: React.ReactNode;
};


export default function StudioHeader({ mode, rightAction }: Props) {
  const { closeStudio } = useStudioContext();

  return (
    <div className="h-14 px-5 max-lg:h-12 max-lg:px-4 flex items-center border-b bg-white">
      {/* Title */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-900">
          Studio
        </span>
      </div>

      {/* Close */}
      {rightAction ? <div className="ml-auto">{rightAction}</div> : null}
      <button
        onClick={closeStudio}
        aria-label="Studio 닫기"
        className="rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
      >
        <X size={18} />
      </button>
    </div>
  );
}
