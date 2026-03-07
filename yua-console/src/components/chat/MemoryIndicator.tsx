"use client";

import { useEffect } from "react";
import { useMemoryIndicator } from "@/store/useMemoryIndicator";
import { CheckCircle, AlertCircle, Loader } from "lucide-react";

export default function MemoryIndicator() {
  const { status, message, setIdle } = useMemoryIndicator();

  // 저장 완료/실패 후 자동 숨김
  useEffect(() => {
    if (status === "saved" || status === "failed") {
      const t = setTimeout(() => {
        setIdle();
      }, 2000);
      return () => clearTimeout(t);
    }
  }, [status, setIdle]);

  if (status === "idle") return null;

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50">
      <div
        className={`
          flex items-center gap-2 px-4 py-2 rounded-full text-sm shadow
          ${
            status === "pending"
              ? "bg-zinc-100 text-zinc-700"
              : status === "saved"
              ? "bg-emerald-100 text-emerald-700"
              : "bg-red-100 text-red-700"
          }
        `}
      >
        {status === "pending" && <Loader size={14} className="animate-spin" />}
        {status === "saved" && <CheckCircle size={14} />}
        {status === "failed" && <AlertCircle size={14} />}
        <span>{message}</span>
      </div>
    </div>
  );
}
