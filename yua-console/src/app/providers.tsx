"use client";

import React from "react";
import { ContextMenuProvider } from "@/components/context-menu/ContextMenuProvider";
import ContextMenu from "@/components/context-menu/ContextMenu";
import { AuthProvider } from "@/contexts/AuthContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ContextMenuProvider>
        {children}
        <ContextMenu />
      </ContextMenuProvider>
    </AuthProvider>
  );
}