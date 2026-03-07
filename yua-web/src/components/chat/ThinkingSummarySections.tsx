"use client";

import { useState, useEffect, useRef } from "react";
import type { ThinkingSummaryItem } from "@/store/useStreamSessionStore";

export default function ThinkingSummarySections({
  items,
  onSelect,
  activeId,
}: {
  items: ThinkingSummaryItem[];
  onSelect?: (id: string) => void;
  activeId?: string | null;
}) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

 // 🔒 active summary 자동 스크롤
 useEffect(() => {
   if (!activeId) return;
   itemRefs.current[activeId]?.scrollIntoView({
     block: "center",
     behavior: "smooth",
   });
 }, [activeId]);

  return (
    <div className="mt-6 space-y-5">
      {items.filter(i => i.canExpand).map((item) => {
        const isOpen = open[item.id] ?? true;
        const isActive = activeId === item.id;

        return (
          <div
            key={item.id}
            ref={(el) => {
              itemRefs.current[item.id] = el;
            }}
            data-summary-id={item.id}
          >
            <button
              type="button"
              onClick={() => {
                setOpen(s => ({ ...s, [item.id]: !isOpen }));
                onSelect?.(item.id);
              }}
              className={`
                flex items-center gap-2 text-[16.5px] font-semibold
                ${isActive ? "text-gray-900" : "text-gray-700"}
              `}
            >
              <span>{item.title}</span>
              <span className="opacity-50">{">"}</span>
            </button>

            {isOpen && (
              <div className="mt-1 text-[14px] text-gray-600">
               <div className="text-[15.5px] leading-relaxed">
                  {item.summary}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
