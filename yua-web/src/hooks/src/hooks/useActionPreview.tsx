"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
} from "react";

/* =========================
   Types
========================= */

export type ActionPreviewKind =
  | "SEARCHING"
  | "THINKING_HARD"
  | "VERIFYING"
  | "BRANCHING"
  | "UNKNOWN";

type ActionPreviewState = {
  kind: ActionPreviewKind | null;
  start: (kind: ActionPreviewKind) => void;
  clear: () => void;
};

/* =========================
   Context
========================= */

const ActionPreviewContext =
  createContext<ActionPreviewState | undefined>(undefined);

/* =========================
   Provider
========================= */

export function ActionPreviewProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [kind, setKind] =
    useState<ActionPreviewKind | null>(null);

  const start = useCallback((k: ActionPreviewKind) => {
    setKind(k);
  }, []);

  const clear = useCallback(() => {
    setKind(null);
  }, []);

  return (
    <ActionPreviewContext.Provider
      value={{ kind, start, clear }}
    >
      {children}
    </ActionPreviewContext.Provider>
  );
}

/* =========================
   Hook
========================= */

export function useActionPreview() {
  const ctx = useContext(ActionPreviewContext);
  if (!ctx) {
    throw new Error(
      "useActionPreview must be used within <ActionPreviewProvider>"
    );
  }
  return ctx;
}
