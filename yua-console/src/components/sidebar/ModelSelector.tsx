"use client";

import { useSidebar } from "@/hooks/useSidebar";
import type { ConsoleModelType } from "@/types/console-model";

export default function ModelSelector() {
  const { model, setModel } = useSidebar();

  const options: { label: string; value: ConsoleModelType }[] = [
    { label: "YUA Basic (default)", value: "basic" },
    { label: "YUA Pro", value: "pro" },
    { label: "YUA Spine", value: "spine" },
    { label: "Assistant Mode", value: "assistant" },
    { label: "Developer Mode", value: "developer" },
  ];

  return (
    <div className="flex flex-col gap-2 mb-4">
      <label className="text-xs font-semibold text-black/60">Model</label>

      <select
        value={model}
        onChange={(e) =>
          setModel(e.target.value as ConsoleModelType)
        }
        className="
          w-full px-3 py-2 rounded-lg text-sm 
          bg-white/80 backdrop-blur-xl
          border border-black/10 shadow-sm
          focus:outline-none focus:ring-2 focus:ring-black/20
        "
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
