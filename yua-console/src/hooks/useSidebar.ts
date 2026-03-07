"use client";

import { useState } from "react";
import type { ConsoleModelType } from "@/types/console-model";

export function useSidebar() {
  const [open, setOpen] = useState(false);

  const [tab, setTab] = useState<
    "auth" | "billing" | "keys" | "usage" | "model" | null
  >(null);

  // ✅ 콘솔 UI 전용 model 상태
  const [model, setModel] = useState<ConsoleModelType>("basic");

  // ⚠️ tier도 UI 표시용 (실제 권한은 서버 기준)
  const [tier, setTier] = useState<"free" | "pro" | "business" | "enterprise">(
    "free"
  );

  const toggle = (next?: typeof tab) => {
    if (next) {
      setTab(next);
      setOpen(true);
      return;
    }
    setOpen((v) => !v);
  };

  return {
    open,
    tab,
    toggle,

    model,
    setModel,

    tier,
    setTier,
  };
}
