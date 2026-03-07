// 📂 src/app/instance/[id]/logs/page.tsx
"use client";

import LogsPanel from "@/components/instance/LogsPanel";
import Link from "next/link";

export default async function LogsPage(
  props: { params: Promise<{ id: string }> }
) {
  const { id } = await props.params;

  return (
    <div className="w-full max-w-6xl mx-auto py-10 flex flex-col gap-8">

      {/* Breadcrumb */}
      <div className="text-xs text-black/50 flex items-center gap-2">
        <Link href="/instance" className="hover:underline">Instances</Link>
        <span>/</span>
        <Link href={`/instance/${id}`} className="hover:underline">{id}</Link>
        <span>/</span>
        <span className="text-black">Logs</span>
      </div>

      {/* Title */}
      <div className="flex flex-col gap-2">
        <span
          className="
            rounded-full border border-black/10 bg-white/70 backdrop-blur-xl
            px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] 
            text-black/60
          "
        >
          Instance Logs
        </span>

        <h1 className="text-3xl font-bold text-black leading-tight">
          {id} Logs
        </h1>

        <p className="text-sm text-black/60 max-w-[520px]">
          컨테이너(yua_app)의 실시간 실행 로그를 확인할 수 있습니다.
        </p>
      </div>

      {/* Logs Panel */}
      <LogsPanel instanceId={id} />
    </div>
  );
}
