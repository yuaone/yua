"use client";

import { useCallback, useState } from "react";

export function useChatPlusMenu() {
  const [open, setOpen] = useState(false);

  const toggle = useCallback(() => setOpen(v => !v), []);
  const close = useCallback(() => setOpen(false), []);

  return { open, toggle, close };
}
